/* V5.9A — Adaptive Diagnostic Pilot (test-only).
   Dormant by default. The UI is installed only when ?adaptivePilot=1 is present,
   and route data is returned only when the server-side student pilot gate also
   authorizes the signed-in Practice ticket + question.

   This module is deliberately preview-only:
   - no automatic trigger after a wrong response
   - no changes to Practice selection, marking, hints, scores or saved results
   - no answer-key fields are requested or rendered
   - no production rollout switch is contained in the browser code
*/
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59AdaptiveDiagnosticPilotInstalled) return;
  ROOT.__v59AdaptiveDiagnosticPilotInstalled = true;

  const STYLE_ID = 'v59-adaptive-diagnostic-pilot-style';
  const PANEL_ID = 'v59-adaptive-pilot-panel';
  const BUTTON_ID = 'v59-adaptive-pilot-button';
  const FLAG_NAME = 'adaptivePilot';

  const PILOT_TARGETS = Object.freeze({
    'c4feda04-6c85-4123-baf6-8e38deb1d1fa': 'Decimal comparison',
    'c2041abf-d204-47b3-ba92-3129c97681ae': 'Fraction division',
    '077872ec-2c3c-402f-9c51-491c77500791': 'Multi-step percentage'
  });

  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function flagEnabled(search = ''){
    try {
      return new URLSearchParams(String(search || '')).get(FLAG_NAME) === '1';
    } catch {
      return false;
    }
  }

  function pilotEnabledInBrowser(){
    if (typeof location === 'undefined') return false;
    return flagEnabled(location.search);
  }

  function pickQuestion(q){
    if (!q || typeof q !== 'object') return null;
    return {
      question_id:String(q.question_id || ''),
      exam_year:Number(q.exam_year || 0) || null,
      paper:String(q.paper || ''),
      question_number:String(q.question_number || ''),
      question_text:String(q.question_text || '')
    };
  }

  function pickSkill(s){
    if (!s || typeof s !== 'object') return null;
    return {
      skill_id:String(s.skill_id || ''),
      year_level:Number(s.year_level || 0) || null,
      domain_code:String(s.domain_code || ''),
      mastery_name:String(s.mastery_name || '')
    };
  }

  function projectRoute(route){
    if (!route || typeof route !== 'object') return { status:'NOT_AVAILABLE' };
    if (route.status !== 'READY') return { status:String(route.status || 'NOT_AVAILABLE') };

    return {
      status:'READY',
      version:String(route.version || ''),
      pilot:route.pilot === true,
      recommended_route_type:String(route.recommended_route_type || ''),
      question:pickQuestion(route.question),
      target_skill:pickSkill(route.target_skill),
      secondary_skills:(Array.isArray(route.secondary_skills) ? route.secondary_skills : []).map(item => ({
        ...pickSkill(item),
        mapping_reason:String(item?.mapping_reason || ''),
        mapping_confidence:String(item?.mapping_confidence || '')
      })),
      misconceptions:(Array.isArray(route.misconceptions) ? route.misconceptions : []).map(item => ({
        misconception_id:String(item?.misconception_id || ''),
        evidence_status:String(item?.evidence_status || ''),
        diagnostic_message:String(item?.diagnostic_message || ''),
        student_feedback:String(item?.student_feedback || ''),
        hint_1:String(item?.hint_1 || ''),
        hint_2:String(item?.hint_2 || ''),
        scaffold_id:String(item?.scaffold_id || ''),
        scaffold_name:String(item?.scaffold_name || ''),
        remediation_skill_id:String(item?.remediation_skill_id || ''),
        diagnostic_probe_skill_id:String(item?.diagnostic_probe_skill_id || ''),
        microcheck_count:Number(item?.microcheck_count || 0),
        success_threshold:String(item?.success_threshold || '')
      })),
      direct_prerequisites:(Array.isArray(route.direct_prerequisites) ? route.direct_prerequisites : []).map(item => ({
        ...pickSkill(item),
        relationship_type:String(item?.relationship_type || ''),
        strength:String(item?.strength || ''),
        reason:String(item?.reason || ''),
        mapped_questions:(Array.isArray(item?.mapped_questions) ? item.mapped_questions : []).map(pickQuestion).filter(Boolean)
      }))
    };
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

  function firstFocusableResponse(){
    return document.querySelector('#response-input input:not(:disabled), #response-input select:not(:disabled), #response-input textarea:not(:disabled)');
  }

  async function getPracticeAccess(){
    if (typeof validateStudentAccess !== 'function') throw new Error('Student sign-in is not ready.');
    const access = await validateStudentAccess('practice');
    if (!access?.access_token) throw new Error('Sign in as a student before testing the pilot.');
    return access;
  }

  async function requestRoute(questionId){
    if (!pilotEnabledInBrowser()) return { status:'DISABLED' };
    if (!PILOT_TARGETS[String(questionId || '')]) return { status:'NOT_IN_PILOT' };
    if (typeof cloudReady !== 'undefined' && !cloudReady) return { status:'NOT_AVAILABLE' };
    if (typeof cloud === 'undefined' || !cloud?.rpc) return { status:'NOT_AVAILABLE' };

    const access = await getPracticeAccess();
    const { data, error } = await cloud.rpc('student_adaptive_route_preview_v1', {
      p_access_token:access.access_token,
      p_question_id:String(questionId)
    });
    if (error) throw error;
    return projectRoute(data);
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID}{margin-top:10px;border:1px dashed var(--primary);background:color-mix(in srgb,var(--soft) 55%,var(--card));color:var(--primary)}
      #${PANEL_ID}{margin-top:12px;border:1px solid color-mix(in srgb,var(--primary) 35%,var(--border));border-radius:16px;padding:14px;background:color-mix(in srgb,var(--soft) 24%,var(--card));display:grid;gap:12px}
      #${PANEL_ID}.hidden{display:none!important}
      #${PANEL_ID} .v59-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
      #${PANEL_ID} .v59-test-chip{display:inline-flex;padding:4px 8px;border-radius:999px;background:var(--warnbg);color:var(--warn);font-size:11px;font-weight:900;letter-spacing:.03em}
      #${PANEL_ID} .v59-section{border:1px solid var(--border);border-radius:13px;padding:12px;background:var(--card)}
      #${PANEL_ID} .v59-section strong{display:block;margin-bottom:5px}
      #${PANEL_ID} .v59-checks{display:grid;gap:8px;margin-top:8px}
      #${PANEL_ID} .v59-check{border-left:3px solid var(--primary);padding:7px 10px;background:var(--soft);border-radius:8px;font-size:13px;line-height:1.45}
      #${PANEL_ID} .v59-actions{display:flex;gap:8px;flex-wrap:wrap}
      #${PANEL_ID} .v59-status{font-size:13px;line-height:1.5;color:var(--muted)}
      @media(max-width:700px){#${PANEL_ID} .v59-actions button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function statusMessage(status){
    if (status === 'DISABLED') return 'The server-side pilot gate is off for this student. Normal Practice continues unchanged.';
    if (status === 'ACCESS_DENIED') return 'The Practice access ticket could not be verified.';
    if (status === 'NOT_IN_PILOT') return 'This question is not one of the approved pilot targets.';
    return 'No adaptive preview is available for this question yet.';
  }

  function renderRoute(route){
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    if (route.status !== 'READY'){
      panel.classList.remove('hidden');
      panel.innerHTML = `
        <div class="v59-head"><div><span class="v59-test-chip">TEST ONLY</span><h3 style="margin:7px 0 0">Adaptive diagnostic preview</h3></div></div>
        <div class="v59-status">${esc(statusMessage(route.status))}</div>
        <div class="v59-actions"><button type="button" class="outline" data-v59-return>Return to question</button></div>
      `;
      bindReturn();
      return;
    }

    const target = route.target_skill || {};
    const misconception = route.misconceptions?.[0] || null;
    const quickChecks = route.direct_prerequisites.flatMap(prereq =>
      (prereq.mapped_questions || []).map(q => ({ prereq, q }))
    );

    const diagnosticBlock = misconception ? `
      <div class="v59-section">
        <strong>Possible misconception to check</strong>
        <div>${esc(misconception.student_feedback || misconception.diagnostic_message)}</div>
        ${misconception.scaffold_name ? `<div class="help" style="margin-top:6px">Suggested scaffold: ${esc(misconception.scaffold_name)}</div>` : ''}
        ${misconception.hint_1 ? `<div class="help">Hint 1: ${esc(misconception.hint_1)}</div>` : ''}
        ${misconception.hint_2 ? `<div class="help">Hint 2: ${esc(misconception.hint_2)}</div>` : ''}
        ${misconception.microcheck_count ? `<div class="help">Recovery check: ${esc(misconception.microcheck_count)} quick item(s) · ${esc(misconception.success_threshold || 'teacher-defined threshold')}</div>` : ''}
      </div>
    ` : '';

    const checksBlock = quickChecks.length ? `
      <div class="v59-section">
        <strong>Recommended quick checks</strong>
        <div class="v59-checks">
          ${quickChecks.map(({prereq,q}) => `
            <div class="v59-check">
              <b>${esc(prereq.mastery_name)}</b><br>
              ${esc(`${q.exam_year || ''} ${q.paper || ''} Q${q.question_number || ''}`.trim())}: ${esc(q.question_text)}
            </div>
          `).join('')}
        </div>
      </div>
    ` : `
      <div class="v59-section"><strong>Recommended quick checks</strong><div class="help">No mapped diagnostic question is available yet.</div></div>
    `;

    panel.classList.remove('hidden');
    panel.innerHTML = `
      <div class="v59-head">
        <div>
          <span class="v59-test-chip">TEST ONLY · NO SCORE CHANGE</span>
          <h3 style="margin:7px 0 2px">Adaptive diagnostic preview</h3>
          <div class="help">${esc(PILOT_TARGETS[route.question?.question_id] || 'Pilot question')} · ${esc(route.recommended_route_type.replaceAll('_',' '))}</div>
        </div>
      </div>
      <div class="v59-section">
        <strong>Current target</strong>
        <div>${esc(target.mastery_name || target.skill_id || 'Mapped curriculum skill')}</div>
        <div class="help">${esc(target.skill_id || '')}${target.year_level ? ` · Year ${esc(target.year_level)}` : ''}</div>
      </div>
      ${diagnosticBlock}
      ${checksBlock}
      <div class="v59-status">This preview does not submit a response, change the Practice score, alter question order, or save mastery data.</div>
      <div class="v59-actions"><button type="button" class="primary" data-v59-return>Return to target question</button></div>
    `;
    bindReturn();
  }

  function bindReturn(){
    document.querySelectorAll(`#${PANEL_ID} [data-v59-return]`).forEach(button => {
      button.addEventListener('click', () => {
        document.getElementById(PANEL_ID)?.classList.add('hidden');
        firstFocusableResponse()?.focus();
      });
    });
  }

  async function openPreview(questionId){
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    panel.classList.remove('hidden');
    panel.innerHTML = '<div class="v59-status">Loading secure adaptive route…</div>';
    try {
      renderRoute(await requestRoute(questionId));
    } catch (error) {
      console.warn('V5.9A adaptive pilot preview failed.', error);
      renderRoute({ status:'NOT_AVAILABLE' });
    }
  }

  function ensureQuizUi(){
    if (!pilotEnabledInBrowser() || typeof document === 'undefined') return false;
    const q = currentPilotQuestion();
    const answerBox = document.querySelector('#quiz .answerbox');
    if (!answerBox) return false;

    document.getElementById(BUTTON_ID)?.remove();
    document.getElementById(PANEL_ID)?.remove();
    if (!q) return true;

    const button = document.createElement('button');
    button.type = 'button';
    button.id = BUTTON_ID;
    button.className = 'outline';
    button.textContent = `🧪 Adaptive Pilot Preview · ${PILOT_TARGETS[String(q.id)]}`;

    const panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'hidden';
    panel.setAttribute('aria-label','Adaptive diagnostic pilot preview');

    answerBox.insertAdjacentElement('beforebegin', button);
    button.insertAdjacentElement('afterend', panel);
    button.addEventListener('click', () => openPreview(String(q.id)));
    return true;
  }

  function installRenderWrapper(){
    if (!pilotEnabledInBrowser()) return true;
    if (ROOT.__v59AdaptiveRenderWrapperInstalled) return true;
    if (typeof renderQuestion !== 'function') return false;

    const baseRenderQuestion = renderQuestion;
    renderQuestion = function(...args){
      const result = baseRenderQuestion.apply(this, args);
      window.setTimeout(ensureQuizUi, 0);
      return result;
    };
    ROOT.__v59AdaptiveRenderWrapperInstalled = true;
    return true;
  }

  function install(){
    if (!pilotEnabledInBrowser()) return true;
    injectStyles();
    return installRenderWrapper();
  }

  function scheduleInstall(){
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!pilotEnabledInBrowser()) return;
    let tries = 0;
    const run = () => {
      tries += 1;
      if (install() || tries >= 100) return;
      window.setTimeout(run, 100);
    };
    run();
  }

  const api = Object.freeze({
    flagEnabled,
    projectRoute,
    requestRoute,
    pilotTargets:() => ({ ...PILOT_TARGETS })
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window, 'V59AdaptiveDiagnosticPilot', {
      value:api,
      writable:false,
      configurable:false
    });
    scheduleInstall();
  }
})();
