/* V5.9B — Interactive Adaptive Diagnostic Pilot (test-only).
   Activated only with ?adaptivePilot=2 and the server-side demo-student gate.

   The normal Practice attempt and score remain authoritative. This module only:
   - checks whether the approved target was completed incorrectly after two tries
   - offers an optional unscored diagnostic sequence
   - grades diagnostic responses server-side without exposing answer keys
   - offers one unscored retry of the original target
   - records only diagnostic correctness events, never mastery or score changes
*/
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59bAdaptiveInteractivePilotInstalled) return;
  ROOT.__v59bAdaptiveInteractivePilotInstalled = true;

  const FLAG_NAME = 'adaptivePilot';
  const FLAG_VALUE = '2';
  const PANEL_ID = 'v59b-adaptive-panel';
  const STYLE_ID = 'v59b-adaptive-style';

  const PILOT_TARGETS = Object.freeze({
    'c4feda04-6c85-4123-baf6-8e38deb1d1fa': 'Decimal comparison',
    'c2041abf-d204-47b3-ba92-3129c97681ae': 'Fraction division',
    '077872ec-2c3c-402f-9c51-491c77500791': 'Multi-step percentage'
  });

  let flow = null;
  let triggerGeneration = 0;
  const offeredTargets = new Set();

  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function flagEnabled(search = ''){
    try {
      return new URLSearchParams(String(search || '')).get(FLAG_NAME) === FLAG_VALUE;
    } catch {
      return false;
    }
  }

  function enabledInBrowser(){
    return typeof location !== 'undefined' && flagEnabled(location.search);
  }

  function currentPilotQuestion(){
    try {
      if (typeof state === 'undefined' || !state || !Array.isArray(state.questions)) return null;
      const item = state.questions[state.index];
      if (!item) return null;
      const rows = item?._kind === 'multipart' && Array.isArray(item.parts) ? item.parts : [item];
      return rows.find(row => PILOT_TARGETS[String(row?.id || '')]) || null;
    } catch {
      return null;
    }
  }

  function safeConfig(type, cfg){
    const c = cfg && typeof cfg === 'object' && !Array.isArray(cfg) ? cfg : {};
    if (type === 'number') return { tolerance:Number(c.tolerance || 0) };
    if (type === 'number_unit') return {
      unit:String(c.unit || ''),
      accepted_units:(Array.isArray(c.accepted_units) ? c.accepted_units : []).map(String),
      tolerance:Number(c.tolerance || 0)
    };
    if (type === 'fraction') return { simplest_form:c.simplest_form === true };
    if (type === 'multiple_choice' || type === 'multi_select') return {
      options:(Array.isArray(c.options) ? c.options : []).map(o => ({
        value:String(o?.value ?? ''), label:String(o?.label ?? o?.value ?? '')
      }))
    };
    if (type === 'multi_blank') return {
      blanks:(Array.isArray(c.blanks) ? c.blanks : []).map((b,i) => ({ label:String(b?.label || `Blank ${i+1}`) }))
    };
    return {};
  }

  function safeQuestion(q){
    if (!q || typeof q !== 'object') return null;
    const type = String(q.response_type || 'text');
    return {
      question_id:String(q.question_id || ''),
      exam_year:Number(q.exam_year || 0) || null,
      paper:String(q.paper || ''),
      question_number:String(q.question_number || ''),
      question_text:String(q.question_text || ''),
      image_url:String(q.image_url || ''),
      response_type:type,
      response_config:safeConfig(type,q.response_config)
    };
  }

  function projectPlan(data){
    if (!data || typeof data !== 'object') return { status:'NOT_AVAILABLE' };
    if (data.status !== 'READY') return { status:String(data.status || 'NOT_AVAILABLE') };
    return {
      status:'READY',
      pilot_version:String(data.pilot_version || ''),
      target:safeQuestion(data.target),
      steps:(Array.isArray(data.steps) ? data.steps : []).map(step => ({
        step_order:Number(step?.step_order || 0),
        step_label:String(step?.step_label || 'Quick check'),
        skill_id:String(step?.skill_id || ''),
        question:safeQuestion(step?.question)
      })).filter(step => step.question?.question_id),
      remediation:data.remediation && typeof data.remediation === 'object' ? {
        student_feedback:String(data.remediation.student_feedback || ''),
        diagnostic_message:String(data.remediation.diagnostic_message || ''),
        hint_1:String(data.remediation.hint_1 || ''),
        hint_2:String(data.remediation.hint_2 || ''),
        scaffold_id:String(data.remediation.scaffold_id || ''),
        scaffold_name:String(data.remediation.scaffold_name || ''),
        microcheck_count:Number(data.remediation.microcheck_count || 0),
        success_threshold:String(data.remediation.success_threshold || '')
      } : null
    };
  }

  function projectGrade(data){
    if (!data || typeof data !== 'object') return { status:'NOT_AVAILABLE' };
    return {
      status:String(data.status || 'NOT_AVAILABLE'),
      correct:data.correct === true,
      stage:String(data.stage || ''),
      feedback:String(data.feedback || ''),
      hint_1:String(data.hint_1 || ''),
      hint_2:String(data.hint_2 || ''),
      scaffold_name:String(data.scaffold_name || '')
    };
  }

  async function getPracticeAccess(){
    if (typeof validateStudentAccess !== 'function') throw new Error('Student sign-in is not ready.');
    const access = await validateStudentAccess('practice');
    if (!access?.access_token) throw new Error('Student Practice access is required.');
    return access;
  }

  async function rpc(name,args){
    if (typeof cloudReady !== 'undefined' && !cloudReady) throw new Error('Cloud access is not ready.');
    if (typeof cloud === 'undefined' || !cloud?.rpc) throw new Error('Cloud access is not ready.');
    const { data, error } = await cloud.rpc(name,args);
    if (error) throw error;
    return data;
  }

  async function triggerCheck(questionId){
    const access = await getPracticeAccess();
    const data = await rpc('student_adaptive_trigger_check_v1', {
      p_access_token:access.access_token,
      p_question_id:String(questionId)
    });
    return {
      status:String(data?.status || 'NOT_AVAILABLE'),
      should_offer:data?.should_offer === true,
      attempts:Number(data?.attempts || 0)
    };
  }

  async function loadPlan(questionId){
    const access = await getPracticeAccess();
    return projectPlan(await rpc('student_adaptive_diagnostic_plan_v1', {
      p_access_token:access.access_token,
      p_target_question_id:String(questionId)
    }));
  }

  async function gradeAdaptive(targetId, questionId, stage, response){
    const access = await getPracticeAccess();
    return projectGrade(await rpc('student_adaptive_diagnostic_grade_v1', {
      p_access_token:access.access_token,
      p_target_question_id:String(targetId),
      p_question_id:String(questionId),
      p_stage:String(stage),
      p_response:response
    }));
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID}{margin:14px 0;border:1px solid color-mix(in srgb,var(--primary) 40%,var(--border));border-radius:18px;padding:15px;background:color-mix(in srgb,var(--soft) 28%,var(--card));display:grid;gap:12px}
      #${PANEL_ID}.hidden{display:none!important}
      #${PANEL_ID} .v59b-chip{display:inline-flex;padding:4px 8px;border-radius:999px;background:var(--warnbg);color:var(--warn);font-size:11px;font-weight:900}
      #${PANEL_ID} h3{margin:7px 0 3px}
      #${PANEL_ID} .v59b-card{border:1px solid var(--border);border-radius:14px;padding:13px;background:var(--card)}
      #${PANEL_ID} .v59b-meta{font-size:12px;color:var(--muted);font-weight:700;margin-bottom:7px}
      #${PANEL_ID} .v59b-question{font-size:17px;font-weight:800;line-height:1.45;margin:4px 0 12px}
      #${PANEL_ID} .v59b-image{display:block;max-width:100%;max-height:300px;object-fit:contain;border:1px solid var(--border);border-radius:12px;margin:8px 0 12px;background:#fff}
      #${PANEL_ID} .v59b-input{display:grid;gap:9px;max-width:520px}
      #${PANEL_ID} .v59b-unit{display:grid;grid-template-columns:minmax(0,1fr) minmax(120px,190px);gap:9px}
      #${PANEL_ID} .v59b-fraction{display:inline-grid;grid-template-rows:auto 2px auto;gap:6px;width:min(190px,100%)}
      #${PANEL_ID} .v59b-fraction input{text-align:center;font-weight:800}
      #${PANEL_ID} .v59b-fracbar{height:2px;background:var(--text)}
      #${PANEL_ID} .v59b-choice{display:grid;gap:8px}
      #${PANEL_ID} .v59b-choice label{display:flex;align-items:flex-start;gap:9px;border:1px solid var(--border);padding:10px;border-radius:11px;background:var(--card)}
      #${PANEL_ID} .v59b-choice input{width:auto;min-height:auto;margin-top:4px}
      #${PANEL_ID} .v59b-feedback{border-radius:12px;padding:11px 12px;line-height:1.45}
      #${PANEL_ID} .v59b-feedback.ok{background:var(--successbg);color:var(--success)}
      #${PANEL_ID} .v59b-feedback.try{background:var(--warnbg);color:var(--warn)}
      #${PANEL_ID} .v59b-feedback.no{background:var(--dangerbg);color:var(--danger)}
      #${PANEL_ID} .v59b-actions{display:flex;gap:9px;flex-wrap:wrap}
      #${PANEL_ID} .v59b-progress{font-size:12px;color:var(--muted);font-weight:800}
      @media(max-width:700px){#${PANEL_ID} .v59b-actions button{width:100%}#${PANEL_ID} .v59b-unit{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function panel(){
    let el = document.getElementById(PANEL_ID);
    if (el) return el;
    const answerBox = document.querySelector('#quiz .answerbox');
    if (!answerBox) return null;
    el = document.createElement('section');
    el.id = PANEL_ID;
    el.className = 'hidden';
    el.setAttribute('aria-label','Interactive adaptive diagnostic pilot');
    answerBox.insertAdjacentElement('beforebegin',el);
    return el;
  }

  function clearPanel(){
    flow = null;
    document.getElementById(PANEL_ID)?.remove();
  }

  function referenceText(q){
    if (!q) return '';
    return [q.exam_year, q.paper, q.question_number ? `Q${q.question_number}` : ''].filter(Boolean).join(' · ');
  }

  function inputMarkup(q,prefix){
    const type = q?.response_type || 'text';
    const cfg = q?.response_config || {};
    if (type === 'number') return `<div class="v59b-input"><input id="${prefix}-number" type="number" step="any" inputmode="decimal" placeholder="Enter a number"></div>`;
    if (type === 'number_unit'){
      const units = (cfg.accepted_units?.length ? cfg.accepted_units : [cfg.unit || 'unit']).filter(Boolean);
      return `<div class="v59b-input v59b-unit"><input id="${prefix}-number" type="number" step="any" inputmode="decimal" placeholder="Enter a number"><select id="${prefix}-unit">${units.map(u=>`<option value="${esc(u)}">${esc(u)}</option>`).join('')}</select></div>`;
    }
    if (type === 'fraction') return `<div class="v59b-input"><div class="v59b-fraction"><input id="${prefix}-num" type="number" step="1" inputmode="numeric" placeholder="numerator"><div class="v59b-fracbar"></div><input id="${prefix}-den" type="number" step="1" inputmode="numeric" placeholder="denominator"></div>${cfg.simplest_form?'<div class="help">Give the fraction in its simplest form.</div>':''}</div>`;
    if (type === 'multiple_choice' || type === 'multi_select'){
      const inputType = type === 'multiple_choice' ? 'radio' : 'checkbox';
      return `<div class="v59b-choice">${(cfg.options || []).map((o,i)=>`<label><input type="${inputType}" name="${prefix}-choice" value="${esc(o.value)}"><span><strong>${esc(o.value || String.fromCharCode(65+i))}</strong>${o.label&&o.label!==o.value?` — ${esc(o.label)}`:''}</span></label>`).join('')}</div>`;
    }
    if (type === 'multi_blank') return `<div class="v59b-input">${(cfg.blanks || []).map((b,i)=>`<label>${esc(b.label)}<input id="${prefix}-blank-${i}" autocomplete="off"></label>`).join('')}</div>`;
    return `<div class="v59b-input"><input id="${prefix}-text" autocomplete="off" placeholder="Type your answer"></div>`;
  }

  function readInput(q,prefix){
    const type = q?.response_type || 'text';
    if (type === 'number'){
      const value = document.getElementById(`${prefix}-number`)?.value ?? '';
      return { empty:!String(value).trim(), payload:{ type:'number', value:String(value).trim() } };
    }
    if (type === 'number_unit'){
      const number = document.getElementById(`${prefix}-number`)?.value ?? '';
      const unit = document.getElementById(`${prefix}-unit`)?.value ?? '';
      return { empty:!String(number).trim(), payload:{ type:'number_unit', number:String(number).trim(), unit:String(unit) } };
    }
    if (type === 'fraction'){
      const numerator = document.getElementById(`${prefix}-num`)?.value ?? '';
      const denominator = document.getElementById(`${prefix}-den`)?.value ?? '';
      return { empty:!String(numerator).trim() || !String(denominator).trim(), payload:{ type:'fraction', numerator:String(numerator).trim(), denominator:String(denominator).trim() } };
    }
    if (type === 'multiple_choice'){
      const value = document.querySelector(`input[name="${prefix}-choice"]:checked`)?.value ?? '';
      return { empty:!value, payload:{ type:'multiple_choice', value:String(value) } };
    }
    if (type === 'multi_select'){
      const values = [...document.querySelectorAll(`input[name="${prefix}-choice"]:checked`)].map(x=>String(x.value));
      return { empty:!values.length, payload:{ type:'multi_select', values } };
    }
    if (type === 'multi_blank'){
      const values = (q.response_config?.blanks || []).map((_,i)=>String(document.getElementById(`${prefix}-blank-${i}`)?.value ?? '').trim());
      return { empty:values.some(v=>!v), payload:{ type:'multi_blank', values } };
    }
    const value = document.getElementById(`${prefix}-text`)?.value ?? '';
    return { empty:!String(value).trim(), payload:{ type:'text', value:String(value).trim() } };
  }

  function setBusy(button,busy,label='Checking…'){
    if (!button) return;
    if (!button.dataset.originalLabel) button.dataset.originalLabel = button.textContent || '';
    button.disabled = busy;
    button.textContent = busy ? label : button.dataset.originalLabel;
  }

  function renderOffer(targetId){
    const el = panel();
    if (!el) return;
    el.classList.remove('hidden');
    el.innerHTML = `
      <span class="v59b-chip">TEST ONLY · NO SCORE CHANGE</span>
      <div class="v59b-card">
        <h3>Want a quick check before moving on?</h3>
        <p>You have used both tries on <strong>${esc(PILOT_TARGETS[targetId] || 'this skill')}</strong>. I can check the building blocks first, then let you retry the original skill without changing your Practice score.</p>
        <div class="v59b-actions"><button type="button" class="primary" data-v59b-start>Start quick diagnostic</button><button type="button" class="outline" data-v59b-skip>Skip and continue Practice</button></div>
      </div>`;
    el.querySelector('[data-v59b-start]')?.addEventListener('click', () => startFlow(targetId));
    el.querySelector('[data-v59b-skip]')?.addEventListener('click', () => {
      el.classList.add('hidden');
      document.getElementById('next-btn')?.focus();
    });
    el.scrollIntoView({ behavior:'smooth', block:'center' });
  }

  async function startFlow(targetId){
    const el = panel();
    if (!el) return;
    el.classList.remove('hidden');
    el.innerHTML = '<div class="v59b-card">Loading your quick diagnostic…</div>';
    try{
      const plan = await loadPlan(targetId);
      if (plan.status !== 'READY' || !plan.target || !plan.steps.length){
        el.innerHTML = '<div class="v59b-card"><strong>Diagnostic unavailable.</strong><div class="help">Continue normal Practice for now.</div></div>';
        return;
      }
      flow = { targetId, plan, stepIndex:0, results:[] };
      renderStep();
    }catch(error){
      console.warn('V5.9B diagnostic plan failed.',error);
      el.innerHTML = '<div class="v59b-card"><strong>Could not load the diagnostic.</strong><div class="help">Your normal Practice work is unaffected.</div></div>';
    }
  }

  function renderStep(){
    const el = panel();
    if (!el || !flow) return;
    const step = flow.plan.steps[flow.stepIndex];
    if (!step){ renderSummary(); return; }
    const q = step.question;
    const prefix = `v59b-step-${flow.stepIndex}`;
    el.classList.remove('hidden');
    el.innerHTML = `
      <span class="v59b-chip">UNSCORED DIAGNOSTIC</span>
      <div class="v59b-progress">Quick check ${flow.stepIndex+1} of ${flow.plan.steps.length}</div>
      <div class="v59b-card">
        <div class="v59b-meta">${esc(step.step_label)} · ${esc(referenceText(q))}</div>
        <div class="v59b-question">${esc(q.question_text)}</div>
        ${q.image_url?`<img class="v59b-image" src="${esc(q.image_url)}" alt="Question diagram">`:''}
        ${inputMarkup(q,prefix)}
        <div id="v59b-step-feedback"></div>
        <div class="v59b-actions" style="margin-top:12px"><button type="button" class="primary" data-v59b-submit>Check this skill</button></div>
      </div>`;
    const submit = el.querySelector('[data-v59b-submit]');
    submit?.addEventListener('click', () => submitStep(step,prefix,submit));
    el.querySelector('input,select')?.focus();
    el.scrollIntoView({ behavior:'smooth', block:'center' });
  }

  async function submitStep(step,prefix,button){
    if (!flow) return;
    const read = readInput(step.question,prefix);
    const fb = document.getElementById('v59b-step-feedback');
    if (read.empty){
      if (fb) fb.innerHTML = '<div class="v59b-feedback try">Enter an answer first.</div>';
      return;
    }
    setBusy(button,true);
    try{
      const grade = await gradeAdaptive(flow.targetId,step.question.question_id,'diagnostic',read.payload);
      if (grade.status !== 'READY') throw new Error('Diagnostic grading is unavailable.');
      flow.results.push({ step_order:step.step_order, skill_id:step.skill_id, correct:grade.correct });
      if (fb){
        fb.innerHTML = grade.correct
          ? `<div class="v59b-feedback ok">✅ ${esc(grade.feedback || 'This building block looks secure.')}</div>`
          : `<div class="v59b-feedback try"><strong>🔎 This is a useful clue.</strong><br>${esc(grade.feedback || 'This prerequisite needs more practice.')}${grade.scaffold_name?`<div class="help" style="margin-top:6px">Try: ${esc(grade.scaffold_name)}</div>`:''}${grade.hint_1?`<div class="help">${esc(grade.hint_1)}</div>`:''}</div>`;
      }
      button.remove();
      const actions = document.querySelector(`#${PANEL_ID} .v59b-actions`);
      if (actions){
        const next = document.createElement('button');
        next.type='button'; next.className='primary';
        next.textContent = flow.stepIndex+1 < flow.plan.steps.length ? 'Next quick check' : 'See what to do next';
        next.addEventListener('click',()=>{ flow.stepIndex += 1; renderStep(); });
        actions.appendChild(next);
      }
    }catch(error){
      console.warn('V5.9B diagnostic grading failed.',error);
      if (fb) fb.innerHTML = '<div class="v59b-feedback no">Could not check this response. Your Practice score is unchanged.</div>';
      setBusy(button,false);
    }
  }

  function renderSummary(){
    const el = panel();
    if (!el || !flow) return;
    const total = flow.results.length;
    const correct = flow.results.filter(r=>r.correct).length;
    const needsSupport = total > 0 && correct < total;
    const remediation = flow.plan.remediation;
    el.innerHTML = `
      <span class="v59b-chip">DIAGNOSTIC COMPLETE</span>
      <div class="v59b-card">
        <h3>${needsSupport?'We found a building block to strengthen':'Your building blocks look secure'}</h3>
        <p>${correct} of ${total} quick checks were correct.</p>
        ${needsSupport && remediation ? `<div class="v59b-feedback try"><strong>Suggested support</strong><br>${esc(remediation.student_feedback || remediation.diagnostic_message || 'Review the prerequisite skill, then try the target again.')}${remediation.scaffold_name?`<div class="help" style="margin-top:6px">Scaffold: ${esc(remediation.scaffold_name)}</div>`:''}${remediation.hint_1?`<div class="help">${esc(remediation.hint_1)}</div>`:''}</div>` : ''}
        <p class="help" style="margin-top:10px">Now retry the original target once. This retry is for learning only and will not change the score already recorded for the Practice question.</p>
        <div class="v59b-actions"><button type="button" class="primary" data-v59b-retry>Retry original target</button></div>
      </div>`;
    el.querySelector('[data-v59b-retry]')?.addEventListener('click',renderTargetRetry);
    el.scrollIntoView({ behavior:'smooth', block:'center' });
  }

  function renderTargetRetry(){
    const el = panel();
    if (!el || !flow) return;
    const q = flow.plan.target;
    const prefix = 'v59b-target-retry';
    el.innerHTML = `
      <span class="v59b-chip">UNSCORED TARGET RETRY</span>
      <div class="v59b-card">
        <div class="v59b-meta">Back to ${esc(PILOT_TARGETS[flow.targetId] || 'the original skill')} · ${esc(referenceText(q))}</div>
        <div class="v59b-question">${esc(q.question_text)}</div>
        ${q.image_url?`<img class="v59b-image" src="${esc(q.image_url)}" alt="Question diagram">`:''}
        ${inputMarkup(q,prefix)}
        <div id="v59b-retry-feedback"></div>
        <div class="v59b-actions" style="margin-top:12px"><button type="button" class="primary" data-v59b-retry-submit>Check retry</button></div>
      </div>`;
    const submit = el.querySelector('[data-v59b-retry-submit]');
    submit?.addEventListener('click',()=>submitTargetRetry(q,prefix,submit));
    el.querySelector('input,select')?.focus();
    el.scrollIntoView({ behavior:'smooth', block:'center' });
  }

  async function submitTargetRetry(q,prefix,button){
    if (!flow) return;
    const read = readInput(q,prefix);
    const fb = document.getElementById('v59b-retry-feedback');
    if (read.empty){ if (fb) fb.innerHTML='<div class="v59b-feedback try">Enter an answer first.</div>'; return; }
    setBusy(button,true);
    try{
      const grade = await gradeAdaptive(flow.targetId,q.question_id,'target_retry',read.payload);
      if (grade.status !== 'READY') throw new Error('Retry grading is unavailable.');
      if (fb){
        fb.innerHTML = grade.correct
          ? '<div class="v59b-feedback ok"><strong>✅ Nice recovery.</strong><br>You solved the target on the unscored retry.</div>'
          : `<div class="v59b-feedback try"><strong>Keep this as a focus skill.</strong><br>${esc(grade.feedback || 'More practice will help.')}${grade.scaffold_name?`<div class="help">Try: ${esc(grade.scaffold_name)}</div>`:''}</div>`;
      }
      button.remove();
      const actions = document.querySelector(`#${PANEL_ID} .v59b-actions`);
      if (actions){
        const done = document.createElement('button');
        done.type='button'; done.className='primary'; done.textContent='Continue Practice';
        done.addEventListener('click',()=>{
          document.getElementById(PANEL_ID)?.classList.add('hidden');
          const next = document.getElementById('next-btn');
          if (next){ next.scrollIntoView({behavior:'smooth',block:'center'}); next.focus(); }
        });
        actions.appendChild(done);
      }
    }catch(error){
      console.warn('V5.9B target retry failed.',error);
      if (fb) fb.innerHTML='<div class="v59b-feedback no">Could not check the retry. Your normal Practice result is unaffected.</div>';
      setBusy(button,false);
    }
  }

  async function maybeOffer(targetId,generation){
    if (!enabledInBrowser() || generation !== triggerGeneration || offeredTargets.has(targetId)) return;
    const current = currentPilotQuestion();
    if (!current || String(current.id) !== String(targetId)) return;
    try{
      const result = await triggerCheck(targetId);
      if (generation !== triggerGeneration) return;
      if (result.status === 'READY' && result.should_offer){
        offeredTargets.add(targetId);
        renderOffer(targetId);
      }
    }catch(error){
      console.warn('V5.9B trigger check failed.',error);
    }
  }

  function scheduleTriggerCheck(targetId){
    triggerGeneration += 1;
    const generation = triggerGeneration;
    [350,900,1700].forEach(delay => window.setTimeout(()=>maybeOffer(targetId,generation),delay));
  }

  function installClickWatcher(){
    if (ROOT.__v59bAdaptiveClickWatcherInstalled) return;
    ROOT.__v59bAdaptiveClickWatcherInstalled = true;
    document.addEventListener('click',event=>{
      const check = event.target?.closest?.('#check-btn');
      if (!check) return;
      const q = currentPilotQuestion();
      if (!q) return;
      scheduleTriggerCheck(String(q.id));
    },true);
  }

  function installRenderWrapper(){
    if (ROOT.__v59bAdaptiveRenderWrapperInstalled) return true;
    if (typeof renderQuestion !== 'function') return false;
    const baseRenderQuestion = renderQuestion;
    renderQuestion = function(...args){
      clearPanel();
      triggerGeneration += 1;
      return baseRenderQuestion.apply(this,args);
    };
    ROOT.__v59bAdaptiveRenderWrapperInstalled = true;
    return true;
  }

  function install(){
    if (!enabledInBrowser()) return true;
    injectStyles();
    if (!installRenderWrapper()) return false;
    installClickWatcher();
    return true;
  }

  function scheduleInstall(){
    if (typeof window === 'undefined' || typeof document === 'undefined' || !enabledInBrowser()) return;
    let tries=0;
    const run=()=>{ tries+=1; if (install() || tries>=100) return; window.setTimeout(run,100); };
    run();
  }

  const api = Object.freeze({
    flagEnabled,
    safeConfig,
    safeQuestion,
    projectPlan,
    projectGrade,
    pilotTargets:()=>({ ...PILOT_TARGETS })
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V59BAdaptiveInteractivePilot',{ value:api,writable:false,configurable:false });
    scheduleInstall();
  }
})();
