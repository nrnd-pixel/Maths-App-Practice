/* Phase 4 — consolidated V5.5C + V5.5C.1 Past Paper Practice resume.
   Same-device recovery remains a distinct wrapper outside past-paper-core.js so
   the untouched V5.7A cross-device layer can continue to capture and wrap the
   accepted V5.5C startPractice/nextQuestion boundary. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__phase4PastPaperResumeInstalled) return;
  ROOT.__phase4PastPaperResumeInstalled = true;

  // Historical compatibility flags were set when the retired files loaded.
  ROOT.__v55cResumePastPaperPracticeInstalled = true;
  ROOT.__v55c1ResumeButtonBridgeInstalled = true;

  const STORAGE_KEY = 'mathPastPaperResumeV55C';
  const VERSION = 1;
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const CARD_ID = 'v55c-resume-card';
  const STYLE_ID = 'v55c-resume-style';

  let installed = false;
  let resumeRequested = false;
  let activeCheckpointKey = '';
  let bridgeInstalled = false;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g, ' ');

  function safeJsonParse(value, fallback){
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function readStore(storage){
    if (!storage || typeof storage.getItem !== 'function') return {};
    const parsed = safeJsonParse(storage.getItem(STORAGE_KEY) || '{}', {});
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  }

  function writeStore(storage, store){
    if (!storage || typeof storage.setItem !== 'function') return false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(store || {}));
      return true;
    } catch {
      return false;
    }
  }

  function identityKey(studentId, studentName, yearLevel, examYear, paper){
    return [
      norm(studentId || studentName),
      Number(yearLevel) || 0,
      Number(examYear) || 0,
      norm(paper)
    ].join('|');
  }

  function checkpointIsFresh(snapshot, now = Date.now()){
    if (!snapshot || Number(snapshot.version) !== VERSION) return false;
    const saved = Date.parse(snapshot.savedAt || '');
    return Number.isFinite(saved) && now >= saved && now - saved <= MAX_AGE_MS;
  }

  function pruneStore(store, now = Date.now()){
    const source = store && typeof store === 'object' ? store : {};
    return Object.fromEntries(
      Object.entries(source).filter(([,snapshot]) => checkpointIsFresh(snapshot, now))
    );
  }

  function itemRows(item){
    return item?._kind === 'multipart' && Array.isArray(item.parts) && item.parts.length
      ? item.parts
      : [item];
  }

  function questionItemId(item){
    if (!item) return '';
    if (item._kind === 'multipart' && Array.isArray(item.parts)){
      const ids = item.parts.map(part => trim(part?.id)).filter(Boolean);
      return ids.length ? `multipart:${ids.join(',')}` : trim(item.id);
    }
    return trim(item.id);
  }

  function questionItemIds(items){
    return (Array.isArray(items) ? items : []).map(questionItemId).filter(Boolean);
  }

  /* Persist only the student's response/outcome. Do not persist question answer
     keys or explanatory feedback from a completed Practice question. */
  function safeAnswer(answer){
    if (!answer || typeof answer !== 'object') return null;
    return {
      questionId:trim(answer.questionId),
      responseType:trim(answer.responseType || 'text'),
      finalAnswer:trim(answer.finalAnswer),
      correct:!!answer.correct,
      firstTry:!!answer.firstTry,
      attempts:Math.max(1, Number(answer.attempts) || 1),
      hintUsed:!!answer.hintUsed,
      manualReview:!!answer.manualReview,
      responsePayload:answer.manualReview && answer.responsePayload && typeof answer.responsePayload === 'object'
        ? answer.responsePayload
        : {},
      marksPossible:Math.max(1, Number(answer.marksPossible) || 1)
    };
  }

  function buildCheckpoint(stateLike, meta, now = new Date().toISOString()){
    const s = stateLike || {};
    const questions = Array.isArray(s.questions) ? s.questions : [];
    const nextIndex = Math.max(0, Math.min(questions.length, Number(meta?.nextIndex ?? s.index) || 0));
    return {
      version:VERSION,
      studentId:trim(meta?.studentId || s.studentId),
      studentName:trim(meta?.studentName || s.student),
      yearLevel:Number(meta?.yearLevel || s.year || 0),
      examYear:Number(meta?.examYear || s.v55a_exam_year || 0),
      paper:trim(meta?.paper || s.v55a_paper),
      scope:meta?.scope === 'all' ? 'all' : 'quick',
      questionIds:questionItemIds(questions),
      nextIndex,
      first:Math.max(0, Number(s.first) || 0),
      mastered:Math.max(0, Number(s.mastered) || 0),
      hints:Math.max(0, Number(s.hints) || 0),
      second:Math.max(0, Number(s.second) || 0),
      answers:(Array.isArray(s.answers) ? s.answers : []).map(safeAnswer).filter(Boolean),
      startedAt:s.startedAt || now,
      savedAt:now
    };
  }

  function applyCheckpointToItems(snapshot, items){
    const list = Array.isArray(items) ? items : [];
    const byId = new Map(list.map(item => [questionItemId(item), item]));
    const wanted = Array.isArray(snapshot?.questionIds) ? snapshot.questionIds : [];
    const ordered = wanted.map(id => byId.get(id)).filter(Boolean);
    return { ordered, missing:Math.max(0, wanted.length - ordered.length) };
  }

  function rehydrateAnswers(snapshot, items){
    const rows = (Array.isArray(items) ? items : []).flatMap(itemRows).filter(Boolean);
    const byId = new Map(rows.map(row => [trim(row.id), row]));
    return (Array.isArray(snapshot?.answers) ? snapshot.answers : []).map(saved => {
      const q = byId.get(trim(saved.questionId)) || {};
      return {
        questionId:trim(saved.questionId),
        question:q.question_number
          ? `Q${q.question_number}: ${trim(q.question_text)}`
          : trim(q.question_text),
        strand:trim(q.strand),
        topic:trim(q.topic),
        subtopic:trim(q.subtopic),
        skill:trim(q.skill),
        responseType:trim(saved.responseType || q.response_type || 'text'),
        finalAnswer:trim(saved.finalAnswer),
        correct:!!saved.correct,
        firstTry:!!saved.firstTry,
        attempts:Math.max(1, Number(saved.attempts) || 1),
        hintUsed:!!saved.hintUsed,
        manualReview:!!saved.manualReview,
        responsePayload:saved.manualReview && saved.responsePayload && typeof saved.responsePayload === 'object'
          ? saved.responsePayload
          : {},
        marksPossible:Math.max(1, Number(saved.marksPossible || q.marks) || 1),
        correctAnswer:'',
        explanation:''
      };
    });
  }

  function currentSelection(){
    if (typeof document === 'undefined') return null;
    const studentId = trim(document.getElementById('student-id')?.value);
    const studentName = trim(document.getElementById('student-name')?.value);
    const yearLevel = Number(document.getElementById('year-level')?.value || 0);
    const examYear = Number(document.getElementById('v55a-paper-year')?.value || 0);
    const paper = trim(document.getElementById('v55a-paper-name')?.value);
    if ((!studentId && !studentName) || !yearLevel || !examYear || !paper) return null;
    return { studentId, studentName, yearLevel, examYear, paper };
  }

  function currentKey(){
    const selection = currentSelection();
    return selection
      ? identityKey(selection.studentId, selection.studentName, selection.yearLevel, selection.examYear, selection.paper)
      : '';
  }

  function readCheckpointForCurrent(){
    if (typeof localStorage === 'undefined') return null;
    const store = pruneStore(readStore(localStorage));
    writeStore(localStorage, store);
    const key = currentKey();
    const snapshot = key ? store[key] : null;
    return snapshot && checkpointIsFresh(snapshot) ? { key, snapshot } : null;
  }

  function saveCheckpoint(snapshot, key){
    if (!snapshot || !key || typeof localStorage === 'undefined') return false;
    const store = pruneStore(readStore(localStorage));
    store[key] = snapshot;
    const ok = writeStore(localStorage, store);
    if (ok) activeCheckpointKey = key;
    return ok;
  }

  function removeCheckpoint(key){
    if (!key || typeof localStorage === 'undefined') return;
    const store = readStore(localStorage);
    delete store[key];
    writeStore(localStorage, pruneStore(store));
    if (activeCheckpointKey === key) activeCheckpointKey = '';
    renderResumeCard();
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${CARD_ID}{margin-top:12px}
      #${CARD_ID}.hidden{display:none!important}
      #${CARD_ID} .v55c-card{border:1px solid color-mix(in srgb,var(--primary) 44%,var(--border));background:color-mix(in srgb,var(--soft) 38%,var(--card));border-radius:14px;padding:13px;display:grid;gap:10px}
      #${CARD_ID} .v55c-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
      #${CARD_ID} .v55c-actions{display:flex;gap:8px;flex-wrap:wrap}
      #${CARD_ID} .v55c-progress{height:9px;border-radius:999px;background:var(--border);overflow:hidden}
      #${CARD_ID} .v55c-progress>span{display:block;height:100%;background:var(--primary)}
      #${CARD_ID} .v55c-help{font-size:12px;line-height:1.45;color:var(--muted)}
    `;
    document.head.appendChild(style);
  }

  function ensureCard(){
    if (typeof document === 'undefined') return null;
    let root = document.getElementById(CARD_ID);
    if (root) return root;
    const paperPanel = document.getElementById('v55a-paper-panel');
    if (!paperPanel) return null;
    root = document.createElement('section');
    root.id = CARD_ID;
    root.className = 'hidden';
    root.setAttribute('aria-label', 'Saved Past Paper Practice');
    paperPanel.appendChild(root);
    return root;
  }

  function renderResumeCard(){
    if (typeof document === 'undefined') return false;
    injectStyles();
    const root = ensureCard();
    if (!root) return false;

    const isPastPaper = ROOT.V55APastPaperPractice?.getPracticeType?.() === 'past_paper';
    const found = isPastPaper ? readCheckpointForCurrent() : null;
    root.classList.toggle('hidden', !found);
    if (!found){
      root.innerHTML = '';
      return true;
    }

    const s = found.snapshot;
    const total = Math.max(0, (s.questionIds || []).length);
    const completed = Math.max(0, Math.min(total, Number(s.nextIndex) || 0));
    const next = Math.min(total, completed + 1);
    const percent = total ? Math.round(completed / total * 100) : 0;
    const saved = new Date(s.savedAt).toLocaleString([], {
      day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'
    });

    root.innerHTML = `
      <div class="v55c-card">
        <div class="v55c-head">
          <div><span class="tag status-active">↻ Resume available</span><div style="font-weight:850;margin-top:5px">Continue ${s.examYear} · ${s.paper}</div></div>
          <strong>${completed}/${total} completed</strong>
        </div>
        <div class="v55c-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${completed}"><span style="width:${percent}%"></span></div>
        <div class="v55c-help">Saved ${saved}. Resume at question ${next || 1}. You will be authorised again before the paper is restored. No PIN or student access token is stored in this saved progress.</div>
        <div class="v55c-actions">
          <button type="button" class="primary" data-v55c-resume>Continue Practice</button>
          <button type="button" class="outline" data-v55c-discard>Discard Saved Progress</button>
        </div>
      </div>`;

    root.querySelector('[data-v55c-resume]')?.addEventListener('click', () => {
      resumeRequested = true;
      document.getElementById('start-btn')?.click();
    });
    root.querySelector('[data-v55c-discard]')?.addEventListener('click', () => {
      if (window.confirm('Discard this saved Past Paper Practice progress?')) removeCheckpoint(found.key);
    });
    return true;
  }

  function checkpointCurrentBoundary(){
    try{
      if (typeof state === 'undefined' || !state || state.v55a_practice_type !== 'past_paper' || !state.done) return false;
      const total = Array.isArray(state.questions) ? state.questions.length : 0;
      const nextIndex = Math.min(total, Number(state.index || 0) + 1);
      if (!total || nextIndex >= total) return false;

      const scope = ROOT.V55BFullPaperPractice?.getScope?.() === 'all' || state.v55b_paper_scope === 'all_available'
        ? 'all'
        : 'quick';
      const meta = {
        studentId:state.studentId,
        studentName:state.student,
        yearLevel:state.year,
        examYear:state.v55a_exam_year,
        paper:state.v55a_paper,
        scope,
        nextIndex
      };
      const snapshot = buildCheckpoint(state, meta);
      const key = identityKey(meta.studentId, meta.studentName, meta.yearLevel, meta.examYear, meta.paper);
      return saveCheckpoint(snapshot, key);
    } catch {
      return false;
    }
  }

  async function restoreFromCheckpoint(found){
    const snapshot = found?.snapshot;
    if (!snapshot || typeof getQuestions !== 'function' || typeof buildPracticeItems !== 'function') return false;

    const previousQueryState = typeof state !== 'undefined' && state
      ? { year:state.year, strand:state.strand, topic:state.topic, difficulty:state.difficulty }
      : null;
    try{
      if (typeof state !== 'undefined' && state){
        state.year = Number(snapshot.yearLevel);
        state.strand = 'all';
        state.topic = 'all';
        state.difficulty = 'all';
      }

      const pool = await getQuestions();
      const items = buildPracticeItems(pool);
      const rebuilt = applyCheckpointToItems(snapshot, items);
      if (!rebuilt.ordered.length || rebuilt.missing){
        window.alert('This saved practice can no longer be resumed because the available paper has changed. Please start a new session.');
        removeCheckpoint(found.key);
        return false;
      }

      const nextIndex = Number(snapshot.nextIndex) || 0;
      if (nextIndex >= rebuilt.ordered.length){
        removeCheckpoint(found.key);
        return false;
      }

      const restoredAnswers = rehydrateAnswers(snapshot, rebuilt.ordered);
      resetState();
      Object.assign(state, {
        student:snapshot.studentName,
        studentId:snapshot.studentId,
        year:Number(snapshot.yearLevel),
        classGroup:document.getElementById('class-group')?.value || 'Other',
        strand:'all', topic:'all', difficulty:'all',
        count:rebuilt.ordered.length,
        questions:rebuilt.ordered,
        index:Math.max(0, Math.min(rebuilt.ordered.length - 1, nextIndex)),
        answers:restoredAnswers,
        first:Number(snapshot.first) || 0,
        mastered:Number(snapshot.mastered) || 0,
        hints:Number(snapshot.hints) || 0,
        second:Number(snapshot.second) || 0,
        startedAt:snapshot.startedAt || new Date().toISOString(),
        source:'cloud',
        v55a_practice_type:'past_paper',
        v55a_exam_year:Number(snapshot.examYear),
        v55a_paper:snapshot.paper,
        v55b_paper_scope:snapshot.scope === 'all' ? 'all_available' : 'quick'
      });

      activeCheckpointKey = found.key;
      ROOT.V55BFullPaperPractice?.setScope?.(snapshot.scope === 'all' ? 'all' : 'quick');
      const studentPill = document.getElementById('student-pill');
      const classPill = document.getElementById('class-pill');
      const pathPill = document.getElementById('path-pill');
      if (studentPill) studentPill.textContent = state.studentId ? `${state.student} • ${state.studentId}` : state.student;
      if (classPill) classPill.textContent = `Year ${state.year}${state.classGroup === 'Other' ? '' : state.classGroup}`;
      if (pathPill) pathPill.textContent = `${snapshot.examYear} · ${snapshot.paper} · Resumed Practice`;
      show('quiz');
      renderQuestion();
      return true;
    } catch (error){
      console.warn('V5.5C saved Past Paper Practice could not be restored.', error);
      if (previousQueryState && typeof state !== 'undefined' && state) Object.assign(state, previousQueryState);
      window.alert('Could not resume this practice right now. Your saved progress has been kept.');
      return false;
    }
  }

  function installResumeButtonBridge(){
    if (bridgeInstalled) return true;
    if (typeof document === 'undefined') return true;
    if (!ROOT.__v55cResumePastPaperPracticeWrappersInstalled) return false;
    const button = document.getElementById('next-btn');
    if (!button || typeof ROOT.nextQuestion !== 'function') return false;

    // Deliberately resolve ROOT.nextQuestion at click time. The legacy shell
    // captured the pre-wrapper function during boot; untouched V5.7A will later
    // replace ROOT.nextQuestion again and rebind this same Practice-only button.
    button.onclick = () => ROOT.nextQuestion();
    button.dataset.v55cResumeBridge = 'true';
    bridgeInstalled = true;
    return true;
  }

  function installWrappers(){
    if (ROOT.__v55cResumePastPaperPracticeWrappersInstalled) return true;
    if (!ROOT.__phase4PastPaperCoreWrappersInstalled) return false;
    if (typeof startPractice !== 'function' || typeof nextQuestion !== 'function' || typeof finishPractice !== 'function') return false;

    const baseStartPractice = startPractice;
    const baseNextQuestion = nextQuestion;
    const baseFinishPractice = finishPractice;

    const wrappedStartPractice = async function(...args){
      const isPastPaper = ROOT.V55APastPaperPractice?.getPracticeType?.() === 'past_paper';
      const found = isPastPaper ? readCheckpointForCurrent() : null;

      // Load-bearing short circuit: an explicit successful local resume returns
      // without entering the fresh-start chain captured from past-paper-core.js.
      if (resumeRequested && found){
        resumeRequested = false;
        if (await restoreFromCheckpoint(found)) return;
      }
      resumeRequested = false;

      if (isPastPaper && found){
        const replace = window.confirm('Saved progress exists for this paper. Press OK to start a new session and replace it, or Cancel to keep the saved session.');
        if (!replace) return;
        removeCheckpoint(found.key);
      }

      await baseStartPractice.apply(this, args);
      try{
        if (typeof state !== 'undefined' && state?.v55a_practice_type === 'past_paper'
            && document.getElementById('quiz')?.classList.contains('active')){
          activeCheckpointKey = identityKey(
            state.studentId, state.student, state.year, state.v55a_exam_year, state.v55a_paper
          );
        }
      } catch {}
    };

    // MUST stay synchronous: untouched V5.7A snapshots, calls this synchronously,
    // then starts its asynchronous server save after this local boundary returns.
    const wrappedNextQuestion = function(...args){
      checkpointCurrentBoundary();
      return baseNextQuestion.apply(this, args);
    };

    const wrappedFinishPractice = async function(...args){
      const key = activeCheckpointKey || currentKey();
      try {
        return await baseFinishPractice.apply(this, args);
      } finally {
        // Preserve V5.5C semantics: cleanup is attempted even if lower completion throws.
        if (key) removeCheckpoint(key);
      }
    };

    try { startPractice = wrappedStartPractice; } catch {}
    try { nextQuestion = wrappedNextQuestion; } catch {}
    try { finishPractice = wrappedFinishPractice; } catch {}
    try { ROOT.startPractice = wrappedStartPractice; } catch {}
    try { ROOT.nextQuestion = wrappedNextQuestion; } catch {}
    try { ROOT.finishPractice = wrappedFinishPractice; } catch {}

    ROOT.__v55cResumePastPaperPracticeWrappersInstalled = true;
    ROOT.__phase4PastPaperResumeWrappersInstalled = true;
    return true;
  }

  function wireUi(){
    if (typeof document === 'undefined') return false;
    ensureCard();
    ['student-id','student-name','year-level','v55a-paper-year','v55a-paper-name'].forEach(id => {
      const node = document.getElementById(id);
      node?.addEventListener('input', () => window.setTimeout(renderResumeCard, 0));
      node?.addEventListener('change', () => window.setTimeout(renderResumeCard, 0));
    });
    document.addEventListener('click', event => {
      if (event.target?.closest?.('.v55a-practice-type')) window.setTimeout(renderResumeCard, 0);
    }, true);
    window.addEventListener('storage', event => {
      if (event.key === STORAGE_KEY) renderResumeCard();
    });
    window.addEventListener('pageshow', renderResumeCard);
    return true;
  }

  function install(){
    if (installed) return true;
    const wrappersReady = installWrappers();
    const uiReady = wireUi();
    const bridgeReady = wrappersReady && installResumeButtonBridge();
    if (!wrappersReady || !uiReady || !bridgeReady) return false;
    installed = true;
    renderResumeCard();
    return true;
  }

  function scheduleInstall(){
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    let tries = 0;
    const run = () => {
      tries += 1;
      if (install() || tries >= 120) return;
      window.setTimeout(run, 100);
    };
    run();
  }

  const api = Object.freeze({
    STORAGE_KEY, VERSION, MAX_AGE_MS,
    identityKey, checkpointIsFresh, pruneStore,
    questionItemId, questionItemIds,
    safeAnswer, buildCheckpoint, applyCheckpointToItems, rehydrateAnswers,
    readStore, writeStore
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window, 'V55CResumePastPaperPractice', {
      value:api,
      writable:false,
      configurable:false
    });
    scheduleInstall();
  }
})();
