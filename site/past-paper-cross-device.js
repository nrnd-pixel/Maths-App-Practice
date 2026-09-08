/* V5.7A — Cross-device Past Paper Practice resume.
   Adds a secure server-backed checkpoint over the accepted V5.5C same-device
   fallback. The server stores question order plus student response/outcome
   evidence derived from Practice grading events; it never stores PINs, access
   tokens, correct answers, hint text or explanations. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v57aCrossDevicePastPaperResumeInstalled) return;
  ROOT.__v57aCrossDevicePastPaperResumeInstalled = true;

  const RPC_GET = 'get_student_past_paper_checkpoints_v57a';
  const RPC_SAVE = 'save_student_past_paper_checkpoint_v57a';
  const RPC_DELETE = 'delete_student_past_paper_checkpoint_v57a';
  const CARD_ID = 'v57a-cross-device-resume-card';
  const STYLE_ID = 'v57a-cross-device-resume-style';
  const STATUS_ID = 'v57a-cross-device-save-status';
  const BANNER_ID = 'v57a-cross-device-save-banner';
  const CACHE_MS = 12000;

  const checkpoints = new Map();
  let studentMeta = null;
  let lastLoadedAt = 0;
  let loading = false;
  let installed = false;
  let resumeRequestedKey = '';
  let activePaperKey = '';

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const html = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function paperKey(examYear,paper){
    return `${Number(examYear)||0}|${norm(paper)}`;
  }

  function signedIn(){
    if (typeof document === 'undefined') return false;
    return !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  /* Background checkpoint work must never initiate student sign-in. V4.0C1
     already keeps the current verified Practice access object in the existing
     activeStudentAccess binding. Read it passively instead of calling
     validateStudentAccess(), which would otherwise open credential alerts when
     a page-load/focus refresh races before sign-in has completed. */
  function passivePracticeAccess(){
    if (!signedIn()) return null;
    try {
      const access = typeof activeStudentAccess !== 'undefined'
        ? activeStudentAccess
        : ROOT.activeStudentAccess;
      if (!access?.access_token) return null;
      if (access.purpose && access.purpose !== 'practice') return null;
      return access;
    } catch {
      return null;
    }
  }

  function currentSelection(){
    if (typeof document === 'undefined') return null;
    const examYear = Number(document.getElementById('v55a-paper-year')?.value || 0);
    const paper = trim(document.getElementById('v55a-paper-name')?.value);
    const yearLevel = Number(document.getElementById('year-level')?.value || 0);
    const studentId = trim(document.getElementById('student-id')?.value);
    const studentName = trim(document.getElementById('student-name')?.value);
    const isPastPaper = ROOT.V55APastPaperPractice?.getPracticeType?.() === 'past_paper';
    if (!isPastPaper || !examYear || !paper) return null;
    return { examYear,paper,yearLevel,studentId,studentName,key:paperKey(examYear,paper) };
  }

  function checkpointFor(examYear,paper){
    return checkpoints.get(paperKey(examYear,paper)) || null;
  }

  function resumeForPaper(row,student){
    const snapshot = checkpointFor(row?.exam_year,row?.paper);
    if (!snapshot) return null;
    const expectedId = norm(student?.student_id);
    const expectedName = norm(student?.student_name);
    if (expectedId && norm(snapshot.studentId) && norm(snapshot.studentId) !== expectedId) return null;
    if (!expectedId && expectedName && norm(snapshot.studentName) && norm(snapshot.studentName) !== expectedName) return null;
    return { ...snapshot, _resumeSource:'server' };
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${CARD_ID}{margin-top:12px}
      #${CARD_ID}.hidden{display:none!important}
      #${CARD_ID} .v57a-card{border:1px solid color-mix(in srgb,var(--primary) 48%,var(--border));background:color-mix(in srgb,var(--soft) 42%,var(--card));border-radius:14px;padding:13px;display:grid;gap:10px}
      #${CARD_ID} .v57a-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
      #${CARD_ID} .v57a-progress{height:9px;border-radius:999px;background:var(--border);overflow:hidden}
      #${CARD_ID} .v57a-progress>span{display:block;height:100%;background:var(--primary)}
      #${CARD_ID} .v57a-help{font-size:12px;line-height:1.45;color:var(--muted)}
      #${CARD_ID} .v57a-actions{display:flex;gap:8px;flex-wrap:wrap}
      #${CARD_ID} .v57a-assignment{font-size:12px;font-weight:800;color:var(--primary)}
      #v55c-resume-card.v57a-server-shadowed{display:none!important}
      #${STATUS_ID}{margin-left:6px}
      #${BANNER_ID}{margin:10px 0 0;padding:10px 12px;border:1px solid color-mix(in srgb,var(--success) 32%,var(--border));border-radius:12px;background:var(--successbg);color:var(--success);font-size:12px;font-weight:850;line-height:1.4}
      #${BANNER_ID}.hidden{display:none!important}
      #${BANNER_ID}.warn{border-color:color-mix(in srgb,var(--warn) 34%,var(--border));background:var(--warnbg);color:var(--warn)}
    `;
    document.head.appendChild(style);
  }

  function ensureCard(){
    if (typeof document === 'undefined') return null;
    injectStyles();
    let root = document.getElementById(CARD_ID);
    if (root) return root;
    const local = document.getElementById('v55c-resume-card');
    const panel = document.getElementById('v55a-paper-panel');
    if (!local && !panel) return null;
    root = document.createElement('section');
    root.id = CARD_ID;
    root.className = 'hidden';
    root.setAttribute('aria-label','Cross-device saved Past Paper Practice');
    if (local) local.insertAdjacentElement('afterend',root);
    else panel.appendChild(root);
    return root;
  }

  function ensureSaveStatus(){
    if (typeof document === 'undefined') return null;
    let status = document.getElementById(STATUS_ID);
    if (status) return status;
    const path = document.getElementById('path-pill');
    if (!path) return null;
    status = document.createElement('span');
    status.id = STATUS_ID;
    status.className = 'tag hidden';
    path.insertAdjacentElement('afterend',status);
    return status;
  }

  function ensureSaveBanner(){
    if (typeof document === 'undefined') return null;
    injectStyles();
    let banner = document.getElementById(BANNER_ID);
    if (banner) return banner;
    const quizbar = document.querySelector('#quiz .quizbar');
    if (!quizbar) return null;
    banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.className = 'hidden';
    banner.setAttribute('role','status');
    banner.setAttribute('aria-live','polite');
    quizbar.insertAdjacentElement('afterend',banner);
    return banner;
  }

  function setSaveStatus(text,kind='saved'){
    const status = ensureSaveStatus();
    const banner = ensureSaveBanner();
    if (!text){
      status?.classList.add('hidden');
      banner?.classList.add('hidden');
      return;
    }
    if (status){
      status.textContent = text;
      status.classList.remove('hidden','warn','status-active');
      status.classList.add(kind === 'error' ? 'warn' : 'status-active');
    }
    if (banner){
      banner.textContent = text;
      banner.classList.remove('hidden','warn');
      if (kind === 'error') banner.classList.add('warn');
    }
  }

  function localApi(){ return ROOT.V55CResumePastPaperPractice || null; }

  function localSnapshotFor(snapshot){
    const api = localApi();
    if (!api || typeof localStorage === 'undefined' || !snapshot) return null;
    try {
      const store = api.pruneStore(api.readStore(localStorage));
      const key = api.identityKey(
        snapshot.studentId || studentMeta?.student_id,
        snapshot.studentName || studentMeta?.student_name,
        snapshot.yearLevel || studentMeta?.year_level,
        snapshot.examYear,
        snapshot.paper
      );
      return store[key] || null;
    } catch { return null; }
  }

  function removeLocalSnapshot(snapshot){
    const api = localApi();
    if (!api || typeof localStorage === 'undefined' || !snapshot) return;
    try {
      const store = api.readStore(localStorage);
      const key = api.identityKey(
        snapshot.studentId || studentMeta?.student_id,
        snapshot.studentName || studentMeta?.student_name,
        snapshot.yearLevel || studentMeta?.year_level,
        snapshot.examYear,
        snapshot.paper
      );
      delete store[key];
      api.writeStore(localStorage,api.pruneStore(store));
    } catch {}
  }

  function cacheLocalSnapshot(snapshot){
    const api = localApi();
    if (!api || typeof localStorage === 'undefined' || !snapshot) return false;
    try {
      const store = api.pruneStore(api.readStore(localStorage));
      const key = api.identityKey(
        snapshot.studentId || studentMeta?.student_id,
        snapshot.studentName || studentMeta?.student_name,
        snapshot.yearLevel || studentMeta?.year_level,
        snapshot.examYear,
        snapshot.paper
      );
      store[key] = { ...snapshot,version:1 };
      return api.writeStore(localStorage,store);
    } catch { return false; }
  }

  function renderCard(){
    if (typeof document === 'undefined') return false;
    const root = ensureCard();
    if (!root) return false;
    const selection = currentSelection();
    const found = selection ? checkpointFor(selection.examYear,selection.paper) : null;
    const local = document.getElementById('v55c-resume-card');
    local?.classList.toggle('v57a-server-shadowed',!!found);
    root.classList.toggle('hidden',!found);

    if (!found){
      root.innerHTML = '';
      return true;
    }

    const total = Math.max(0,Array.isArray(found.questionIds) ? found.questionIds.length : 0);
    const completed = Math.max(0,Math.min(total,Number(found.nextIndex)||0));
    const next = Math.min(total,completed+1);
    const percent = total ? Math.round(completed/total*100) : 0;
    const savedDate = new Date(found.savedAt || Date.now());
    const saved = Number.isNaN(savedDate.getTime()) ? 'recently' : savedDate.toLocaleString([],{
      day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'
    });
    const assignment = found.assignmentContext;

    root.innerHTML = `
      <div class="v57a-card">
        <div class="v57a-head">
          <div><span class="tag status-active">☁ Saved across devices</span><div style="font-weight:850;margin-top:5px">Continue ${Number(found.examYear)} · ${html(found.paper)}</div></div>
          <strong>${completed}/${total} completed</strong>
        </div>
        <div class="v57a-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${completed}"><span style="width:${percent}%"></span></div>
        <div class="v57a-help">Saved ${html(saved)}. Resume at question ${next || 1} on this device or another device after signing in. Your PIN and access token are never stored in this checkpoint.</div>
        ${assignment?`<div class="v57a-assignment">📄 Teacher assignment · ${html(assignment.selectionMode==='all_available'?'All Available Questions':'Quick Session')}</div>`:''}
        <div class="v57a-actions">
          <button type="button" class="primary" data-v57a-resume>Continue Practice</button>
          <button type="button" class="outline" data-v57a-discard>Discard Saved Progress</button>
        </div>
      </div>`;

    root.querySelector('[data-v57a-resume]')?.addEventListener('click',()=>{
      resumeRequestedKey = paperKey(found.examYear,found.paper);
      document.getElementById('start-btn')?.click();
    });
    root.querySelector('[data-v57a-discard]')?.addEventListener('click',async()=>{
      if (!window.confirm('Discard this saved Past Paper Practice progress on all devices?')) return;
      try { await deleteCheckpoint(found.examYear,found.paper,{removeLocal:true}); }
      catch(error){ window.alert(error?.message || 'Saved progress could not be discarded.'); }
    });
    return true;
  }

  function cacheRows(data){
    checkpoints.clear();
    studentMeta = data?.student || null;
    for (const row of Array.isArray(data?.checkpoints) ? data.checkpoints : []){
      if (!row?.examYear || !trim(row?.paper)) continue;
      checkpoints.set(paperKey(row.examYear,row.paper),row);
    }
  }

  async function refreshCheckpoints(force=false){
    if (loading) return checkpoints;
    if (!signedIn()){
      checkpoints.clear();
      studentMeta = null;
      lastLoadedAt = 0;
      renderCard();
      return checkpoints;
    }
    if (!force && lastLoadedAt && Date.now()-lastLoadedAt<CACHE_MS){
      renderCard();
      return checkpoints;
    }

    const access = passivePracticeAccess();
    if (!access?.access_token){
      renderCard();
      return checkpoints;
    }

    loading = true;
    try {
      const {data,error} = await cloud.rpc(RPC_GET,{p_access_token:access.access_token});
      if (error) throw error;
      cacheRows(data || {student:{},checkpoints:[]});
      lastLoadedAt = Date.now();
      renderCard();
      window.dispatchEvent(new CustomEvent('v57a:checkpoints-updated',{detail:{count:checkpoints.size}}));
      return checkpoints;
    } catch(error){
      console.warn('V5.7A cross-device checkpoints could not be loaded.',error);
      renderCard();
      return checkpoints;
    } finally { loading = false; }
  }

  async function deleteCheckpoint(examYear,paper,{removeLocal=true}={}){
    const snapshot = checkpointFor(examYear,paper) || {examYear,paper,...(studentMeta?{
      studentId:studentMeta.student_id,studentName:studentMeta.student_name,yearLevel:studentMeta.year_level
    }:{})};
    const access = passivePracticeAccess();
    if (!access?.access_token) throw new Error('Student sign-in is required.');
    const {error} = await cloud.rpc(RPC_DELETE,{
      p_access_token:access.access_token,p_exam_year:Number(examYear),p_paper:trim(paper)
    });
    if (error) throw error;
    checkpoints.delete(paperKey(examYear,paper));
    if (removeLocal) removeLocalSnapshot(snapshot);
    lastLoadedAt = Date.now();
    renderCard();
    window.dispatchEvent(new CustomEvent('v57a:checkpoints-updated',{detail:{count:checkpoints.size}}));
    return true;
  }

  function boundarySnapshot(){
    try {
      if (typeof state === 'undefined' || !state || state.v55a_practice_type !== 'past_paper' || !state.done) return null;
      const questions = Array.isArray(state.questions) ? state.questions : [];
      const nextIndex = Math.min(questions.length,Number(state.index||0)+1);
      if (!questions.length || nextIndex >= questions.length) return null;
      const api = localApi();
      if (!api?.questionItemIds) return null;
      const scope = ROOT.V55BFullPaperPractice?.getScope?.() === 'all' || state.v55b_paper_scope === 'all_available' ? 'all' : 'quick';
      return {
        version:1,
        yearLevel:Number(state.year||0),
        examYear:Number(state.v55a_exam_year||0),
        paper:trim(state.v55a_paper),
        scope,
        questionIds:api.questionItemIds(questions),
        nextIndex,
        startedAt:state.startedAt || new Date().toISOString()
      };
    } catch { return null; }
  }

  function matchingAssignment(snapshot){
    if (!snapshot) return null;
    try {
      const api = ROOT.V56BTeacherAssignedPastPaperPractice;
      const context = api?.readAssignmentContext?.();
      if (!context || !api?.validContext?.(context)) return null;
      if (Number(context.examYear)!==Number(snapshot.examYear) || norm(context.paper)!==norm(snapshot.paper)) return null;
      return context;
    } catch { return null; }
  }

  async function saveBoundary(snapshot,assignment){
    if (!snapshot) return false;
    try {
      const access = passivePracticeAccess();
      if (!access?.access_token){
        setSaveStatus('Saved on this device only','error');
        return false;
      }
      setSaveStatus('☁ Saving across devices…','saved');
      const {data,error} = await cloud.rpc(RPC_SAVE,{
        p_access_token:access.access_token,
        p_snapshot:snapshot,
        p_assignment_id:assignment?.assignmentId || null,
        p_assignment_attempt_id:assignment?.attemptId || null
      });
      if (error) throw error;
      if (data?.saved){
        lastLoadedAt = 0;
        setSaveStatus('☁ Saved across devices','saved');
        await refreshCheckpoints(true);
      } else if (data?.completed){
        checkpoints.delete(paperKey(snapshot.examYear,snapshot.paper));
        setSaveStatus('☁ Progress saved','saved');
      }
      return true;
    } catch(error){
      console.warn('V5.7A cross-device checkpoint save failed; same-device fallback remains available.',error);
      setSaveStatus('Saved on this device only','error');
      return false;
    }
  }

  async function selectPaperForSnapshot(snapshot){
    const api = ROOT.V55APastPaperPractice;
    if (!api) throw new Error('Past Paper Practice is not ready.');
    api.setPracticeType?.('past_paper');
    await api.loadPaperLibrary?.(false);
    const year = document.getElementById('v55a-paper-year');
    const paper = document.getElementById('v55a-paper-name');
    if (!year || !paper) throw new Error('Past Paper controls are not ready.');
    year.value = String(Number(snapshot.examYear));
    year.dispatchEvent(new Event('change',{bubbles:true}));
    const option = [...paper.options].find(row=>norm(row.value)===norm(snapshot.paper));
    if (!option) throw new Error('This saved paper is no longer available in Practice.');
    paper.value = option.value;
    paper.dispatchEvent(new Event('change',{bubbles:true}));
    return option.value;
  }

  async function restoreFromServer(snapshot){
    const api = localApi();
    if (!snapshot || !api?.applyCheckpointToItems || !api?.rehydrateAnswers
        || typeof getQuestions !== 'function' || typeof buildPracticeItems !== 'function') return false;

    await refreshCheckpoints(true);
    snapshot = checkpointFor(snapshot.examYear,snapshot.paper) || snapshot;
    const previousQueryState = typeof state !== 'undefined' && state
      ? {year:state.year,strand:state.strand,topic:state.topic,difficulty:state.difficulty}
      : null;

    try {
      const selectedPaper = await selectPaperForSnapshot(snapshot);
      if (typeof state !== 'undefined' && state){
        state.year = Number(snapshot.yearLevel || studentMeta?.year_level || 0);
        state.strand = 'all';
        state.topic = 'all';
        state.difficulty = 'all';
      }
      const pool = await getQuestions();
      const items = buildPracticeItems(pool);
      const rebuilt = api.applyCheckpointToItems(snapshot,items);
      if (!rebuilt.ordered.length || rebuilt.missing){
        window.alert('This saved practice can no longer be resumed because the available paper has changed. Please start a new session.');
        await deleteCheckpoint(snapshot.examYear,snapshot.paper,{removeLocal:true});
        return false;
      }
      const nextIndex = Math.max(0,Number(snapshot.nextIndex)||0);
      if (nextIndex >= rebuilt.ordered.length){
        await deleteCheckpoint(snapshot.examYear,snapshot.paper,{removeLocal:true});
        return false;
      }

      const answers = api.rehydrateAnswers(snapshot,rebuilt.ordered);
      resetState();
      Object.assign(state,{
        student:snapshot.studentName || studentMeta?.student_name || trim(document.getElementById('student-name')?.value),
        studentId:snapshot.studentId || studentMeta?.student_id || trim(document.getElementById('student-id')?.value),
        year:Number(snapshot.yearLevel || studentMeta?.year_level || document.getElementById('year-level')?.value || 0),
        classGroup:document.getElementById('class-group')?.value || studentMeta?.class_name || 'Other',
        strand:'all',topic:'all',difficulty:'all',
        count:rebuilt.ordered.length,
        questions:rebuilt.ordered,
        index:Math.max(0,Math.min(rebuilt.ordered.length-1,nextIndex)),
        answers,
        first:Number(snapshot.first)||0,
        mastered:Number(snapshot.mastered)||0,
        hints:Number(snapshot.hints)||0,
        second:Number(snapshot.second)||0,
        startedAt:snapshot.startedAt || new Date().toISOString(),
        source:'cloud',
        v55a_practice_type:'past_paper',
        v55a_exam_year:Number(snapshot.examYear),
        v55a_paper:selectedPaper,
        v55b_paper_scope:snapshot.scope==='all'?'all_available':'quick'
      });

      ROOT.V55BFullPaperPractice?.setScope?.(snapshot.scope==='all'?'all':'quick');
      if (snapshot.assignmentContext){
        ROOT.V56BTeacherAssignedPastPaperPractice?.writeAssignmentContext?.({
          assignment_id:snapshot.assignmentContext.assignmentId,
          attempt_id:snapshot.assignmentContext.attemptId,
          studentId:state.studentId,
          exam_year:snapshot.examYear,
          paper:selectedPaper,
          selection_mode:snapshot.assignmentContext.selectionMode,
          recommended_count:snapshot.assignmentContext.target
        });
      }

      cacheLocalSnapshot({
        ...snapshot,
        studentId:state.studentId,
        studentName:state.student,
        yearLevel:state.year,
        paper:selectedPaper,
        version:1
      });

      activePaperKey = paperKey(snapshot.examYear,selectedPaper);
      const studentPill = document.getElementById('student-pill');
      const classPill = document.getElementById('class-pill');
      const pathPill = document.getElementById('path-pill');
      if (studentPill) studentPill.textContent = state.studentId ? `${state.student} • ${state.studentId}` : state.student;
      if (classPill) classPill.textContent = `Year ${state.year}${state.classGroup==='Other'?'':state.classGroup}`;
      if (pathPill) pathPill.textContent = snapshot.assignmentContext
        ? `Assigned · ${snapshot.examYear} · ${selectedPaper} · Resumed across devices`
        : `${snapshot.examYear} · ${selectedPaper} · Resumed across devices`;
      show('quiz');
      renderQuestion();
      setSaveStatus('☁ Resumed across devices','saved');
      return true;
    } catch(error){
      console.warn('V5.7A cross-device Practice could not be restored.',error);
      if (previousQueryState && typeof state !== 'undefined' && state) Object.assign(state,previousQueryState);
      window.alert(error?.message || 'Could not resume this practice right now. Your saved progress has been kept.');
      return false;
    }
  }

  function assignmentMatchesCheckpoint(context,snapshot){
    if (!context || !snapshot?.assignmentContext) return false;
    return String(context.assignmentId||'') === String(snapshot.assignmentContext.assignmentId||'')
      && String(context.attemptId||'') === String(snapshot.assignmentContext.attemptId||'');
  }

  async function handleStart(baseStart,args,thisArg){
    const isPastPaper = ROOT.V55APastPaperPractice?.getPracticeType?.() === 'past_paper';
    if (!isPastPaper) return baseStart.apply(thisArg,args);

    await refreshCheckpoints(false);
    const selection = currentSelection();
    const found = selection ? checkpointFor(selection.examYear,selection.paper) : null;

    if (resumeRequestedKey){
      const requested = checkpointFor(...resumeRequestedKey.split('|').map((value,index)=>index===0?Number(value):value));
      resumeRequestedKey = '';
      if (requested && await restoreFromServer(requested)) return;
    }

    if (found){
      const assignment = ROOT.V56BTeacherAssignedPastPaperPractice?.readAssignmentContext?.();
      if (assignmentMatchesCheckpoint(assignment,found)){
        if (await restoreFromServer(found)) return;
      }

      const replace = window.confirm('Saved progress exists for this Past Paper Practice on another device or this device. Press OK to start a new session and replace it, or Cancel to keep the saved session.');
      if (!replace) return;
      await deleteCheckpoint(found.examYear,found.paper,{removeLocal:true});
    }

    const result = await baseStart.apply(thisArg,args);
    try {
      if (typeof state !== 'undefined' && state?.v55a_practice_type === 'past_paper'
          && document.getElementById('quiz')?.classList.contains('active')){
        activePaperKey = paperKey(state.v55a_exam_year,state.v55a_paper);
        setSaveStatus('', 'saved');
      }
    } catch {}
    return result;
  }

  function installWrappers(){
    if (ROOT.__v57aCrossDevicePastPaperResumeWrappersInstalled) return true;
    if (!ROOT.__v55cResumePastPaperPracticeWrappersInstalled) return false;
    const baseStart = typeof ROOT.startPractice === 'function' ? ROOT.startPractice : null;
    const baseNext = typeof ROOT.nextQuestion === 'function' ? ROOT.nextQuestion : null;
    if (!baseStart || !baseNext) return false;

    const wrappedStart = async function(...args){
      return handleStart(baseStart,args,this);
    };
    const wrappedNext = function(...args){
      const snapshot = boundarySnapshot();
      const assignment = matchingAssignment(snapshot);
      const result = baseNext.apply(this,args);
      if (snapshot) void saveBoundary(snapshot,assignment);
      return result;
    };

    try { startPractice = wrappedStart; } catch {}
    try { nextQuestion = wrappedNext; } catch {}
    try { ROOT.startPractice = wrappedStart; } catch {}
    try { ROOT.nextQuestion = wrappedNext; } catch {}

    const startButton = document.getElementById('start-btn');
    if (startButton){
      startButton.onclick = () => ROOT.startPractice();
      startButton.dataset.v57aStartBridge = 'true';
    }
    const nextButton = document.getElementById('next-btn');
    if (nextButton){
      nextButton.onclick = () => ROOT.nextQuestion();
      nextButton.dataset.v57aNextBridge = 'true';
    }

    ROOT.__v57aCrossDevicePastPaperResumeWrappersInstalled = true;
    return true;
  }

  function scheduleRefresh(force=false){
    window.setTimeout(()=>refreshCheckpoints(force),80);
  }

  function wireUi(){
    if (typeof document === 'undefined') return false;
    ensureCard();
    ensureSaveStatus();
    ensureSaveBanner();

    ['v55a-paper-year','v55a-paper-name'].forEach(id=>{
      const node = document.getElementById(id);
      node?.addEventListener('change',()=>scheduleRefresh(false));
    });
    document.addEventListener('click',event=>{
      if (event.target?.closest?.('.v55a-practice-type[data-type="past_paper"]')) scheduleRefresh(false);
      if (event.target?.closest?.('#my-progress-btn,#my-assignments-btn,.v40c-open-learn')) scheduleRefresh(true);
      if (event.target?.closest?.('#v40c-student-logout')){
        checkpoints.clear(); studentMeta=null; lastLoadedAt=0; renderCard(); setSaveStatus('');
      }
    },true);

    const start = document.getElementById('start');
    if (start && typeof MutationObserver !== 'undefined'){
      new MutationObserver(()=>{
        if (start.classList.contains('active') && signedIn()) scheduleRefresh(true);
      }).observe(start,{attributes:true,attributeFilter:['class']});
    }
    const local = document.getElementById('v55c-resume-card');
    if (local && typeof MutationObserver !== 'undefined'){
      new MutationObserver(()=>window.setTimeout(renderCard,0)).observe(local,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    }
    window.addEventListener('pageshow',()=>{ if (signedIn()) scheduleRefresh(true); });
    window.addEventListener('focus',()=>{ if (signedIn() && document.getElementById('start')?.classList.contains('active')) scheduleRefresh(false); });
    return true;
  }

  function install(){
    if (installed) return true;
    const wrappersReady = installWrappers();
    const uiReady = wireUi();
    if (!wrappersReady || !uiReady) return false;
    installed = true;
    if (signedIn()) scheduleRefresh(true);
    return true;
  }

  function scheduleInstall(){
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    let tries = 0;
    const run = () => {
      tries += 1;
      if (install() || tries >= 160) return;
      window.setTimeout(run,100);
    };
    run();
  }

  const api = Object.freeze({
    RPC_GET,RPC_SAVE,RPC_DELETE,paperKey,checkpointFor,resumeForPaper,
    passivePracticeAccess,refreshCheckpoints,renderCard,restoreFromServer,boundarySnapshot
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V57ACrossDevicePastPaperResume',{
      value:api,writable:false,configurable:false
    });
    scheduleInstall();
  }
})();

/* V5.7A.1 — Cross-device resume bridge.
   Mirrors authenticated server checkpoints into the accepted V5.5C local
   checkpoint shape so existing Past Paper Progress / Continue filters work
   without duplicating that UI. Server evidence wins only when it is at least as
   new as the same-device fallback. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v57a1CrossDeviceLocalBridgeInstalled) return;
  ROOT.__v57a1CrossDeviceLocalBridgeInstalled = true;

  let syncing = false;
  const norm = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g,' ');

  function localApi(){ return ROOT.V55CResumePastPaperPractice || null; }
  function serverApi(){ return ROOT.V57ACrossDevicePastPaperResume || null; }
  function signedIn(){
    if (typeof document === 'undefined') return false;
    return !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function currentIdentity(snapshot){
    return {
      studentId:String(snapshot?.studentId || document.getElementById('student-id')?.value || '').trim(),
      studentName:String(snapshot?.studentName || document.getElementById('student-name')?.value || '').trim(),
      yearLevel:Number(snapshot?.yearLevel || document.getElementById('year-level')?.value || 0)
    };
  }

  function mirror(snapshot){
    const local=localApi();
    if (!local || !snapshot || typeof localStorage==='undefined') return false;
    try {
      const identity=currentIdentity(snapshot);
      const key=local.identityKey(identity.studentId,identity.studentName,identity.yearLevel,snapshot.examYear,snapshot.paper);
      const store=local.pruneStore(local.readStore(localStorage));
      const existing=store[key];
      const serverSaved=Date.parse(snapshot.savedAt||'') || 0;
      const localSaved=Date.parse(existing?.savedAt||'') || 0;
      if (existing && localSaved>serverSaved) return false;
      store[key]={...snapshot,version:1,...identity};
      local.writeStore(localStorage,store);
      return true;
    } catch { return false; }
  }

  async function syncFromServer(){
    if (syncing || !signedIn()) return false;
    const server=serverApi();
    const local=localApi();
    const papers=ROOT.V55APastPaperPractice;
    if (!server || !local || !papers) return false;
    syncing=true;
    try {
      try { await papers.loadPaperLibrary?.(false); } catch {}
      const library=papers.getPaperLibrary?.() || [];
      let changed=false;
      for (const row of library){
        const snapshot=server.checkpointFor?.(row?.exam_year,row?.paper);
        if (snapshot) changed=mirror(snapshot) || changed;
      }
      if (changed){
        window.setTimeout(()=>{
          const year=document.getElementById('v55a-paper-year');
          year?.dispatchEvent(new Event('change',{bubbles:true}));
          const paper=document.getElementById('v55a-paper-name');
          paper?.dispatchEvent(new Event('change',{bubbles:true}));
        },0);
      }
      return changed;
    } finally { syncing=false; }
  }

  function currentServerCheckpoint(){
    const server=serverApi();
    if (!server) return null;
    const year=Number(document.getElementById('v55a-paper-year')?.value||0);
    const paper=String(document.getElementById('v55a-paper-name')?.value||'').trim();
    return year&&paper ? server.checkpointFor?.(year,paper) || null : null;
  }

  function interceptLocalResume(event){
    const button=event.target?.closest?.('#v55c-resume-card [data-v55c-resume]');
    if (!button) return;
    const snapshot=currentServerCheckpoint();
    if (!snapshot) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void serverApi()?.restoreFromServer?.(snapshot);
  }

  function wire(){
    window.addEventListener('v57a:checkpoints-updated',()=>void syncFromServer());
    document.addEventListener('click',interceptLocalResume,true);
    document.addEventListener('click',event=>{
      if (event.target?.closest?.('#my-progress-btn,#my-assignments-btn,.v40c-open-learn')){
        window.setTimeout(()=>void syncFromServer(),120);
      }
    },true);
    window.setTimeout(()=>{ if (signedIn()) void syncFromServer(); },300);
  }

  const api=Object.freeze({mirror,syncFromServer,currentServerCheckpoint,signedIn});
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V57A1CrossDeviceLocalBridge',{value:api,writable:false,configurable:false});
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();

/* V5.7A.2 — Stale same-device checkpoint cleanup.
   When a Past Paper Practice is completed on another device, the authoritative
   completed session can outlive an older V5.5C local fallback on this browser.
   This token-gated metadata check removes only local checkpoints older than the
   latest completed Past Paper session for the same signed-in roster student. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v57a2StaleLocalCheckpointCleanupInstalled) return;
  ROOT.__v57a2StaleLocalCheckpointCleanupInstalled = true;

  const RPC_NAME = 'get_student_past_paper_completion_watermarks_v57a';
  const CACHE_MS = 12000;
  let lastLoadedAt = 0;
  let loading = false;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const paperKey = (examYear,paper) => `${Number(examYear)||0}|${norm(paper)}`;

  function signedIn(){
    if (typeof document === 'undefined') return false;
    return !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function passivePracticeAccess(){
    const shared = ROOT.V57ACrossDevicePastPaperResume?.passivePracticeAccess?.();
    if (shared?.access_token) return shared;
    if (!signedIn()) return null;
    try {
      const access = typeof activeStudentAccess !== 'undefined'
        ? activeStudentAccess
        : ROOT.activeStudentAccess;
      if (!access?.access_token) return null;
      if (access.purpose && access.purpose !== 'practice') return null;
      return access;
    } catch {
      return null;
    }
  }

  function matchesStudent(snapshot,student){
    if (!snapshot || !student) return false;
    const currentId = norm(student.student_id);
    const savedId = norm(snapshot.studentId);
    if (currentId) return !!savedId && savedId === currentId;
    const currentName = norm(student.student_name);
    return !!currentName && norm(snapshot.studentName) === currentName
      && Number(snapshot.yearLevel||0) === Number(student.year_level||0);
  }

  function pruneStaleLocalCheckpoints(data,storage){
    const api = ROOT.V55CResumePastPaperPractice;
    if (!api || !storage || !data?.student) return 0;
    const completions = new Map();
    for (const row of Array.isArray(data?.completions) ? data.completions : []){
      const when = Date.parse(row?.completedAt || '');
      if (!Number.isFinite(when)) continue;
      const key = paperKey(row?.examYear,row?.paper);
      const existing = completions.get(key) || 0;
      if (when > existing) completions.set(key,when);
    }
    if (!completions.size) return 0;

    let store;
    try { store = api.pruneStore(api.readStore(storage)); }
    catch { return 0; }
    let removed = 0;
    for (const [key,snapshot] of Object.entries(store)){
      if (!matchesStudent(snapshot,data.student)) continue;
      const completedAt = completions.get(paperKey(snapshot?.examYear,snapshot?.paper)) || 0;
      const savedAt = Date.parse(snapshot?.savedAt || '');
      if (!completedAt || !Number.isFinite(savedAt) || completedAt < savedAt) continue;
      delete store[key];
      removed += 1;
    }
    if (!removed) return 0;
    try { api.writeStore(storage,store); } catch { return 0; }

    window.setTimeout(()=>{
      document.getElementById('v55a-paper-name')?.dispatchEvent(new Event('change',{bubbles:true}));
      window.dispatchEvent(new CustomEvent('v57a:local-fallback-pruned',{detail:{removed}}));
    },0);
    return removed;
  }

  async function refresh(force=false){
    if (loading || !signedIn()) return 0;
    if (!force && lastLoadedAt && Date.now()-lastLoadedAt<CACHE_MS) return 0;
    const access = passivePracticeAccess();
    if (!access?.access_token) return 0;
    loading = true;
    try {
      const {data,error} = await cloud.rpc(RPC_NAME,{p_access_token:access.access_token});
      if (error) throw error;
      lastLoadedAt = Date.now();
      return typeof localStorage === 'undefined' ? 0 : pruneStaleLocalCheckpoints(data,localStorage);
    } catch(error){
      console.warn('V5.7A stale same-device checkpoint cleanup could not run.',error);
      return 0;
    } finally { loading = false; }
  }

  function wire(){
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    window.addEventListener('v57a:checkpoints-updated',()=>void refresh(true));
    window.addEventListener('pageshow',()=>{ if (signedIn()) void refresh(true); });
    window.addEventListener('focus',()=>{ if (signedIn()) void refresh(false); });
    document.addEventListener('click',event=>{
      if (event.target?.closest?.('#my-progress-btn,#my-assignments-btn,.v40c-open-learn')){
        window.setTimeout(()=>void refresh(true),90);
      }
      if (event.target?.closest?.('#v40c-student-logout')) lastLoadedAt = 0;
    },true);
    window.setTimeout(()=>{ if (signedIn()) void refresh(true); },350);
  }

  const api = Object.freeze({RPC_NAME,paperKey,passivePracticeAccess,matchesStudent,pruneStaleLocalCheckpoints,refresh});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V57A2StaleLocalCheckpointCleanup',{
      value:api,writable:false,configurable:false
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();
