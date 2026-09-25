/* V5.8.1A — Practice cloud result reconciliation.
   Fixes a presentation race where a Practice session could be committed to
   Supabase successfully, then a later browser/localStorage error changed the
   Results screen to "Local backup". The saved cloud session is authoritative.

   This patch also prevents an older result screen from being presented as the
   completion result for a newly started teacher assignment. Assignment ownership
   and completion remain server-enforced; this file does not mark assignments
   complete or weaken the started-at boundary. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v581aPracticeCloudResultReconciliationInstalled) return;
  ROOT.__v581aPracticeCloudResultReconciliationInstalled = true;

  let finishWrapped = false;
  let rpcWrapped = false;
  let runtimeWired = false;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);
  const normalizeCode = value => trim(value).toUpperCase().replace(/\s+/g,'');
  const numberOr = (value,fallback=0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function assignmentApi(){
    return ROOT.V56BTeacherAssignedPastPaperPractice || null;
  }

  function currentAssignmentContext(){
    try { return assignmentApi()?.readAssignmentContext?.() || null; }
    catch { return null; }
  }

  function resultIsActive(){
    return !!byId('result')?.classList.contains('active');
  }

  function currentResultCode(){
    return normalizeCode(byId('result-code')?.textContent);
  }

  function clearStaleResultState(){
    if (typeof document === 'undefined') return;
    byId('v56b-assignment-result-note')?.remove();
    document.querySelectorAll('.v42b-assignment-result-note').forEach(node=>node.remove());

    const result = byId('result');
    if (result){
      delete result.dataset.v581CloudVerified;
      delete result.dataset.v581CloudCompletedAt;
    }

    const code = byId('result-code');
    if (code) code.textContent = '';
    byId('result-code-box')?.classList.add('hidden');
    const check = byId('check-this-result');
    if (check){
      check.classList.add('hidden');
      check.dataset.code = '';
    }
  }

  async function loadCloudResult(code=currentResultCode()){
    const normalized = normalizeCode(code);
    if (!normalized || typeof cloud === 'undefined' || !cloud || typeof cloud.rpc !== 'function') return null;
    try {
      const {data,error} = await cloud.rpc('get_student_review',{p_result_code:normalized});
      if (error || !data?.session) return null;
      return data;
    } catch (error){
      console.warn('V5.8.1A could not verify Practice result in cloud.',error);
      return null;
    }
  }

  function secondTrySuccesses(answers){
    return Array.from(answers || []).filter(answer =>
      numberOr(answer?.attempts,0) >= 2
      && answer?.correct === true
      && answer?.first_try === false
    ).length;
  }

  function applyServerSummary(data){
    if (!data?.session || typeof document === 'undefined') return false;
    const session = data.session;
    const answers = Array.isArray(data.answers) ? data.answers : [];
    const pending = numberOr(data.summary?.pending_count,0);
    const autoTotal = Math.max(0,numberOr(session.auto_total,0));
    const first = Math.max(0,numberOr(session.first_try_score,0));
    const mastery = Math.max(0,numberOr(session.mastery_score,0));
    const firstPct = Math.max(0,numberOr(session.first_try_percent,0));
    const masteryPct = Math.max(0,numberOr(session.mastery_percent,0));
    const hints = Math.max(0,numberOr(session.hints_used,0));
    const second = secondTrySuccesses(answers);

    const sync = byId('res-sync');
    if (sync){
      sync.textContent = 'Cloud ✓';
      sync.title = 'Verified from the saved cloud result.';
    }
    if (byId('result-score')) byId('result-score').textContent = autoTotal ? `${first}/${autoTotal} (${firstPct}%)` : 'Pending';
    if (byId('res-mastery')) byId('res-mastery').textContent = autoTotal ? `${mastery}/${autoTotal}` : '—';
    if (byId('res-hints')) byId('res-hints').textContent = String(hints);
    if (byId('res-second')) byId('res-second').textContent = String(second);

    const message = byId('result-message');
    if (message){
      message.textContent = pending
        ? `${pending} response${pending===1?' is':'s are'} waiting for teacher review. Auto-marked score is shown separately.`
        : firstPct>=90
          ? 'Excellent first-try accuracy.'
          : masteryPct>=80
            ? 'Good learning from feedback. Practise again for stronger first-try accuracy.'
            : 'Review the hints and explanations, then practise this skill again.';
    }

    const result = byId('result');
    if (result){
      result.dataset.v581CloudVerified = 'true';
      result.dataset.v581CloudCompletedAt = trim(session.completed_at);
    }
    return true;
  }

  function assignmentResultNote(kind,title,body){
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.v42b-assignment-result-note').forEach(node=>node.remove());
    byId('v56b-assignment-result-note')?.remove();
    const result = byId('result');
    const anchor = result?.querySelector('.v41-recovery-panel') || byId('review');
    if (!result || !anchor) return;
    const note = document.createElement('div');
    note.id = 'v56b-assignment-result-note';
    note.className = `v42b-assignment-result-note ${kind || ''}`;
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = body;
    note.append(strong,span);
    anchor.insertAdjacentElement('beforebegin',note);
  }

  function resultPredatesAssignment(data,context){
    const completed = Date.parse(data?.session?.completed_at || '');
    const started = Date.parse(context?.startedAt || '');
    if (!Number.isFinite(completed) || !Number.isFinite(started)) return false;
    return completed < started - 1000;
  }

  function correctAssignmentMessage(data){
    const context = currentAssignmentContext();
    if (!context || !data?.session) return;
    if (resultPredatesAssignment(data,context)){
      assignmentResultNote(
        'try',
        'Assignment still in progress',
        `This Practice result is safely saved in the cloud, but it was completed before this teacher assignment was started. Open the ${context.examYear} · ${context.paper} assignment and complete a new Practice session to finish it.`
      );
      return;
    }

    const note = byId('v56b-assignment-result-note');
    const text = norm(note?.textContent);
    if (note && text.includes('did not sync to the cloud')){
      note.remove();
      assignmentResultNote(
        'try',
        'Assignment still in progress',
        'This Practice result is saved in the cloud. The assignment still needs a completed matching Practice session started from the teacher assignment.'
      );
    }
  }

  async function reconcileActiveResult(){
    if (!resultIsActive()) return null;
    const code = currentResultCode();
    if (!code) return null;
    const data = await loadCloudResult(code);
    if (!data) return null;
    applyServerSummary(data);
    correctAssignmentMessage(data);
    return data;
  }

  function installFinishWrapper(){
    if (finishWrapped) return true;
    try {
      const base = typeof ROOT.finishPractice === 'function'
        ? ROOT.finishPractice
        : (typeof finishPractice === 'function' ? finishPractice : null);
      if (!base) return false;
      /*
        Item 1 — wrap-order check: the pool-rotation layer stamps __v40PoolWrapped
        on its finishPractice wrapper. If that sentinel is missing the chain is in
        the wrong order, meaning ticket rotation would be skipped. Warn loudly
        rather than composing silently in the wrong order. The install still
        proceeds because the reconciliation layer is additive and safe in either
        order; the warning surfaces the problem for diagnosis.
      */
      if (!base.__v40PoolWrapped) {
        console.warn(
          'V5.8.1A: finishPractice was not yet wrapped by the pool-rotation layer ' +
          '(__v40PoolWrapped sentinel absent). Practice ticket rotation may be skipped. ' +
          'Check the load order in the release loader.'
        );
      }
      const wrapped = async function(...args){
        const output = await base.apply(this,args);
        try { await reconcileActiveResult(); }
        catch (error){ console.warn('V5.8.1A result reconciliation failed.',error); }
        return output;
      };
      try { finishPractice = wrapped; } catch {}
      try { ROOT.finishPractice = wrapped; } catch {}
      finishWrapped = true;
      return true;
    } catch (error){
      console.warn('V5.8.1A could not wrap Practice completion.',error);
      return false;
    }
  }

  function installAssignmentStartGuard(){
    if (rpcWrapped) return true;
    try {
      if (typeof cloud === 'undefined' || !cloud || typeof cloud.rpc !== 'function') return false;
      const previous = cloud.rpc.bind(cloud);
      cloud.rpc = function(name,args,options){
        const rpcName = String(name || '');
        const isAssignmentStart = rpcName === 'start_student_practice_assignment_v56b'
          || rpcName === 'start_student_practice_assignment'
          || rpcName === 'start_student_practice_assignment_v53d1';
        if (isAssignmentStart) clearStaleResultState();
        return previous(name,args,options);
      };
      rpcWrapped = true;
      return true;
    } catch (error){
      console.warn('V5.8.1A could not install assignment start guard.',error);
      return false;
    }
  }

  function wireRuntime(){
    if (runtimeWired || typeof document === 'undefined') return;
    runtimeWired = true;

    document.addEventListener('click',event=>{
      if (event.target?.closest?.('.v42b-start-practice-assignment,.v40c3-priority-action')){
        clearStaleResultState();
      }
    },true);

    const result = byId('result');
    if (result && typeof MutationObserver !== 'undefined'){
      new MutationObserver(()=>{
        if (!result.classList.contains('active')) return;
        window.setTimeout(()=>void reconcileActiveResult(),260);
      }).observe(result,{attributes:true,attributeFilter:['class']});
    }
  }

  function install(){
    const finishReady = installFinishWrapper();
    const rpcReady = installAssignmentStartGuard();
    if (!finishReady || !rpcReady) return false;
    wireRuntime();
    return true;
  }

  function scheduleInstall(){
    if (typeof window === 'undefined') return;
    let tries = 0;
    const run = () => {
      tries += 1;
      if (install() || tries >= 120) return;
      window.setTimeout(run,100);
    };
    run();
  }

  const api = Object.freeze({
    normalizeCode,
    loadCloudResult,
    applyServerSummary,
    resultPredatesAssignment,
    reconcileActiveResult,
    clearStaleResultState
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V581APracticeCloudResultReconciliation',{
      value:api,writable:false,configurable:false
    });
    scheduleInstall();
  }
})();
