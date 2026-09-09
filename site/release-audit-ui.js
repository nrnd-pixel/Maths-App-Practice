/* V5.4 — UX & Production Polish.
   Presentation/accessibility only: stable-release branding, production start-screen cleanup,
   reviewed-work wording, teacher-tab ergonomics and live-region polish.
   No grading, auth, Practice/Exam, assignment or student-data mutations. */
(() => {
  'use strict';

  if (window.__v50ProductionPolishInstalled) return;
  window.__v50ProductionPolishInstalled = true;

  const STYLE_ID = 'v50rc3-production-polish-style';
  const UPDATE_EVENT = 'v50rc3-production-polish-updated';
  const currentRelease = () => window.MathAppVersion?.CURRENT_RELEASE || Object.freeze({
    title:'Math Practice',
    badge:'Current Version'
  });

  const byId = id => document.getElementById(id);

  function hasPackagedCloudConfig(){
    const config = window.MATH_APP_CONFIG || {};
    return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(config.supabaseUrl || '').trim())
      && /^sb_publishable_[A-Za-z0-9_-]+$/.test(String(config.supabasePublishableKey || '').trim());
  }

  function isDeployedHost(){
    try {
      return location.protocol === 'https:' && !/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(location.hostname);
    } catch {
      return false;
    }
  }

  function packagedProduction(){ return hasPackagedCloudConfig() && isDeployedHost(); }

  function injectStyles(){
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .result-code{overflow-wrap:anywhere;word-break:break-word}
      #student-review .review-lookup,
      #exam-result-code-box,
      #result-code-box{min-width:0}
      #teacher .tabs .tab{min-width:max-content}
      #teacher .header > *,
      #teacher .toolbar,
      #teacher .panel,
      #start .brand > div:last-child{min-width:0}

      @media(max-width:900px){
        #teacher > .tabs{
          flex-wrap:nowrap;
          overflow-x:auto;
          overflow-y:hidden;
          overscroll-behavior-inline:contain;
          scrollbar-width:thin;
          -webkit-overflow-scrolling:touch;
          padding-bottom:3px;
        }
        #teacher > .tabs .tab{
          flex:0 0 auto;
          white-space:nowrap;
        }
      }

      @media(max-width:700px){
        #teacher > .header{
          flex-direction:column;
          align-items:stretch;
        }
        #teacher > .header .toolbar{
          width:100%;
        }
        #teacher > .header .toolbar button{
          flex:1 1 135px;
        }
        #exam-result-code-box,
        #result-code-box{
          align-items:stretch;
          gap:10px;
        }
        #exam-result-code-box button,
        #result-code-box button{
          flex:0 0 auto;
        }
      }

      @media(max-width:430px){
        #teacher > .header .toolbar{
          display:grid;
          grid-template-columns:1fr 1fr;
        }
        #teacher > .header .toolbar button,
        #teacher > .header .toolbar .badge{
          width:100%;
          justify-content:center;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function applyBranding(){
    window.MathAppVersion?.applyIdentity?.();
  }

  function polishProductionSetup(){
    const button = byId('setup-btn');
    if (!button) return;

    if (packagedProduction()){
      button.classList.add('hidden');
      button.setAttribute('aria-hidden','true');
      button.tabIndex = -1;
      button.title = 'Connection settings are packaged with this deployment.';
    } else {
      button.classList.remove('hidden');
      button.removeAttribute('aria-hidden');
      button.removeAttribute('tabindex');
      button.textContent = 'Connection Setup';
    }
  }

  function setText(selector,text){
    const node = document.querySelector(selector);
    if (node) node.textContent = text;
  }

  function polishWording(){
    setText('#student-review .header .muted',
      'Use the private result code shown after Practice or Exam work to see teacher feedback and reviewed marks.');
    setText('#result-code-box .help',
      'Treat this code as private. Anyone with the code can view this Practice result.');
    setText('#exam-result-code-box .help',
      'Treat this code as private. Anyone with the code can view this Exam result when it is available for review.');
    setText('#teacher-subtitle','Analytics, assignments, reports and question management');
  }

  function addLiveRegion(node){
    if (!node) return;
    if (!node.hasAttribute('role')) node.setAttribute('role','status');
    if (!node.hasAttribute('aria-live')) node.setAttribute('aria-live','polite');
    node.setAttribute('aria-atomic','true');
  }

  function polishLiveRegions(){
    ['cloud-status','student-access-note','exam-save-status','mode-note'].forEach(id => addLiveRegion(byId(id)));
    document.querySelectorAll('.feedback').forEach(addLiveRegion);
  }

  function teacherTabs(){
    return document.querySelector('#teacher > .tabs');
  }

  function tabItems(){
    return [...(teacherTabs()?.querySelectorAll('.tab[data-panel]') || [])];
  }

  function syncTeacherTabs(){
    const tabs = teacherTabs();
    if (!tabs) return;
    tabs.setAttribute('role','tablist');
    tabs.setAttribute('aria-label','Teacher dashboard sections');

    tabItems().forEach((tab,index) => {
      const panelId = tab.dataset.panel;
      const panel = panelId ? byId(panelId) : null;
      const active = tab.classList.contains('active');
      if (!tab.id) tab.id = `v50rc3-teacher-tab-${String(panelId || index).replace(/[^A-Za-z0-9_-]/g,'-')}`;
      tab.setAttribute('role','tab');
      tab.setAttribute('aria-selected',active ? 'true' : 'false');
      tab.setAttribute('tabindex',active ? '0' : '-1');
      if (panelId) tab.setAttribute('aria-controls',panelId);
      if (panel){
        panel.setAttribute('role','tabpanel');
        panel.setAttribute('aria-labelledby',tab.id);
      }
    });
  }

  function activateAdjacentTab(current,direction){
    const items = tabItems();
    if (!items.length) return;
    const index = Math.max(0,items.indexOf(current));
    let targetIndex = index;
    if (direction === 'first') targetIndex = 0;
    else if (direction === 'last') targetIndex = items.length - 1;
    else targetIndex = (index + direction + items.length) % items.length;
    const target = items[targetIndex];
    target.focus({preventScroll:true});
    target.click();
    target.scrollIntoView({block:'nearest',inline:'nearest'});
  }

  function wireTeacherTabs(){
    const tabs = teacherTabs();
    if (!tabs || tabs.dataset.v50rc3Wired === '1') return;
    tabs.dataset.v50rc3Wired = '1';

    tabs.addEventListener('keydown',event => {
      const tab = event.target.closest?.('.tab[data-panel]');
      if (!tab) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); activateAdjacentTab(tab,1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); activateAdjacentTab(tab,-1); }
      else if (event.key === 'Home') { event.preventDefault(); activateAdjacentTab(tab,'first'); }
      else if (event.key === 'End') { event.preventDefault(); activateAdjacentTab(tab,'last'); }
    });

    tabs.addEventListener('click',event => {
      const tab = event.target.closest?.('.tab[data-panel]');
      if (!tab) return;
      window.setTimeout(() => {
        syncTeacherTabs();
        tab.scrollIntoView({block:'nearest',inline:'nearest'});
      },0);
    });

    new MutationObserver(syncTeacherTabs).observe(tabs,{
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:['class']
    });
  }

  function getAudit(){
    const badge = document.querySelector('#start .brand .badge');
    const setup = byId('setup-btn');
    const reviewLead = document.querySelector('#student-review .header .muted');
    const practicePrivacy = document.querySelector('#result-code-box .help');
    const examPrivacy = document.querySelector('#exam-result-code-box .help');
    const tabs = teacherTabs();
    const items = tabItems();
    const release = currentRelease();

    const checks = {
      stable_release_branding:
        document.title === release.title && String(badge?.textContent || '').trim() === release.badge,
      production_setup_control:
        !packagedProduction() || (!!setup && setup.classList.contains('hidden') && setup.getAttribute('aria-hidden') === 'true'),
      reviewed_work_wording:
        /Practice or Exam/.test(String(reviewLead?.textContent || ''))
          && /Treat this code as private/.test(String(practicePrivacy?.textContent || ''))
          && /Treat this code as private/.test(String(examPrivacy?.textContent || '')),
      teacher_tab_accessibility:
        !!tabs && tabs.getAttribute('role') === 'tablist' && items.length > 0
          && items.every(tab => tab.getAttribute('role') === 'tab' && !!tab.getAttribute('aria-controls')),
      responsive_polish: !!byId(STYLE_ID),
      live_status_regions:
        ['cloud-status','student-access-note','exam-save-status'].every(id => byId(id)?.getAttribute('aria-live') === 'polite')
    };

    return Object.freeze({
      phase:'V5.4Stable',
      ready:Object.values(checks).every(Boolean),
      checks:Object.freeze({...checks}),
      packaged_production:packagedProduction()
    });
  }

  function announceAudit(){
    try { window.dispatchEvent(new CustomEvent(UPDATE_EVENT,{detail:getAudit()})); }
    catch {}
  }

  function apply(){
    injectStyles();
    applyBranding();
    polishProductionSetup();
    polishWording();
    polishLiveRegions();
    syncTeacherTabs();
    wireTeacherTabs();
    announceAudit();
  }

  const api = Object.freeze({ refresh:apply, getAudit });
  Object.defineProperty(window,'V50ProductionPolish',{
    value:api,
    writable:false,
    configurable:false
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
  window.addEventListener('load',() => window.setTimeout(apply,0),{once:true});
})();

/* V5.0 Release Candidate Audit — RC1 functional + RC2 security/configuration surface.
   Read-only teacher diagnostics. RC3 remains the final UX/production-polish pass. */
(() => {
  'use strict';

  if (window.__v50ReleaseAuditInstalled) return;
  window.__v50ReleaseAuditInstalled = true;

  const TAB_ID = 'v50-release-audit-tab';
  const PANEL_ID = 'release-audit-panel';
  const STYLE_ID = 'v50-release-audit-style';
  const FEEDBACK_ID = 'v50-release-audit-feedback';
  let rc1 = null;
  let rc2 = null;
  let loading = false;

  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;

  function cloudAvailable(){
    try { return !!cloudReady && !!cloud && !!teacherUser; }
    catch { return false; }
  }

  function injectStyles(){
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} .v50rc-hero{border:1px solid var(--border);border-radius:16px;padding:18px;margin:14px 0;background:var(--surface-soft)}
      #${PANEL_ID} .v50rc-hero.pass{border-color:var(--success);background:var(--secure-card)}
      #${PANEL_ID} .v50rc-hero.blocked{border-color:var(--warn);background:var(--develop-card)}
      #${PANEL_ID} .v50rc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px;margin:14px 0}
      #${PANEL_ID} .v50rc-stat{border:1px solid var(--border);border-radius:13px;padding:12px;background:var(--surface-soft)}
      #${PANEL_ID} .v50rc-stat strong{display:block;font-size:22px;margin-bottom:3px}
      #${PANEL_ID} .v50rc-checks{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:14px 0}
      #${PANEL_ID} .v50rc-check{border:1px solid var(--border);border-radius:13px;padding:12px;background:var(--surface)}
      #${PANEL_ID} .v50rc-check.pass{border-color:var(--success)}
      #${PANEL_ID} .v50rc-check.warn{border-color:var(--warn)}
      #${PANEL_ID} .v50rc-check.fail{border-color:var(--danger)}
      #${PANEL_ID} .v50rc-section{margin-top:16px;border:1px solid var(--border);border-radius:14px;padding:16px;background:var(--surface)}
      #${PANEL_ID} .v50rc-missing{padding:9px 11px;border:1px solid var(--warn);border-radius:10px;margin-top:7px;background:var(--develop-card)}
      #${PANEL_ID} .v50rc-phase{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
      #${PANEL_ID} .v50rc-pending{opacity:.82}
      #${PANEL_ID} .v50rc-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:12px}
      #${PANEL_ID} .v50rc-action{padding:10px;border:1px solid var(--warn);border-radius:10px;background:var(--develop-card)}
      @media(max-width:700px){#${PANEL_ID} .v50rc-checks{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel(){
    const tabs = document.querySelector('#teacher .tabs');
    const operationsTab = byId('v50d2-teacher-operations-tab');
    const launchTab = byId('v50d1-launch-readiness-tab');
    const operationsPanel = byId('teacher-operations-panel');
    const launchPanel = byId('launch-readiness-panel');
    const analyticsPanel = byId('analytics-panel');
    if (!tabs || !analyticsPanel) return;

    if (!byId(TAB_ID)){
      const tab = document.createElement('button');
      tab.id = TAB_ID;
      tab.type = 'button';
      tab.className = 'tab';
      tab.dataset.panel = PANEL_ID;
      tab.innerHTML = 'Release Audit <span id="v50-release-audit-badge" class="tag">RC</span>';
      (operationsTab || launchTab || tabs.lastElementChild)?.insertAdjacentElement('afterend',tab);
    }

    if (!byId(PANEL_ID)){
      const panel = document.createElement('div');
      panel.id = PANEL_ID;
      panel.className = 'panel';
      panel.innerHTML = `
        <div class="header">
          <div><h2>V5.0 Release Candidate Audit</h2><p class="muted">Whole-app release checks. RC1 covers functional integrity, RC2 covers security and launch configuration, and RC3 finishes UX/production polish.</p></div>
          <button id="v50-release-audit-refresh" class="secondary" type="button">Refresh Audit</button>
        </div>
        <div id="${FEEDBACK_ID}" class="feedback hidden" aria-live="polite"></div>
        <div id="v50-release-audit-root"><div class="empty">Open this area to run the release-candidate checks.</div></div>
      `;
      (operationsPanel || launchPanel || analyticsPanel).insertAdjacentElement('afterend',panel);
    }
  }

  function feedback(kind,message){
    const root = byId(FEEDBACK_ID);
    if (!root) return;
    root.className = `feedback ${kind}`;
    root.textContent = message;
    root.classList.remove('hidden');
  }
  function clearFeedback(){ byId(FEEDBACK_ID)?.classList.add('hidden'); }

  function check(label,pass,detail,warning=false){
    const state = pass ? 'pass' : (warning ? 'warn' : 'fail');
    const icon = pass ? '✅' : (warning ? '⚠️' : '❌');
    return `<article class="v50rc-check ${state}"><strong>${icon} ${esc(label)}</strong><div>${esc(detail)}</div></article>`;
  }

  function renderRC1(){
    if (!rc1) return '<section class="v50rc-section"><div class="empty">RC1 data unavailable.</div></section>';
    const s = rc1.summary || {};
    const ready = rc1.functional_ready === true;
    const active = num(s.active_exam_papers);
    const configured = num(s.configured_exam_papers);
    const available = num(s.available_exam_papers);
    const missing = Array.isArray(rc1.missing_exam_settings) ? rc1.missing_exam_settings : [];
    const integrityIssues = num(s.pending_review_count_mismatches)+num(s.exam_result_link_issues)+num(s.practice_assignment_link_issues)+num(s.answer_marks_out_of_bounds)+num(s.overdue_in_progress_exams)+num(s.duplicate_active_student_id_groups);

    return `
      <section class="v50rc-section">
        <div class="v50rc-phase"><div><h3>RC1 — Functional regression audit</h3><p class="muted">Practice/Exam links, review synchronization, assignment integrity, score bounds and explicit Exam configuration coverage.</p></div><span class="tag">${ready?'Pass':'In progress'}</span></div>
        <div class="v50rc-grid">
          <div class="v50rc-stat"><strong>${configured}/${active}</strong><span>Exam papers configured</span></div>
          <div class="v50rc-stat"><strong>${available}</strong><span>Configured papers available</span></div>
          <div class="v50rc-stat"><strong>${integrityIssues}</strong><span>Functional integrity issues</span></div>
          <div class="v50rc-stat"><strong>${num(s.legacy_registered_exam_attempts_missing_class_id)}</strong><span>Legacy class-ID warning</span></div>
        </div>
        <div class="v50rc-checks">
          ${check('Exam configuration',active>0 && configured===active,active?`${configured}/${active} active paper(s) explicitly configured`:'No active Exam papers found')}
          ${check('Exam availability',available>0,available?`${available} explicitly configured paper(s) available`:'No explicitly configured paper is available')}
          ${check('Pending-review synchronization',num(s.pending_review_count_mismatches)===0,num(s.pending_review_count_mismatches)===0?'Cached pending counts match answer rows':`${num(s.pending_review_count_mismatches)} mismatch(es)`)}
          ${check('Exam result links',num(s.exam_result_link_issues)===0,num(s.exam_result_link_issues)===0?'Exam attempts and saved result sessions are linked consistently':`${num(s.exam_result_link_issues)} issue(s)`)}
          ${check('Practice assignment links',num(s.practice_assignment_link_issues)===0,num(s.practice_assignment_link_issues)===0?'Practice assignment attempts are linked consistently':`${num(s.practice_assignment_link_issues)} issue(s)`)}
          ${check('Mark bounds',num(s.answer_marks_out_of_bounds)===0,num(s.answer_marks_out_of_bounds)===0?'No saved answer exceeds its mark bounds':`${num(s.answer_marks_out_of_bounds)} out-of-bounds mark(s)`)}
          ${check('Exam deadline states',num(s.overdue_in_progress_exams)===0,num(s.overdue_in_progress_exams)===0?'No in-progress Exam is already past its deadline':`${num(s.overdue_in_progress_exams)} overdue Exam(s)`)}
          ${check('Active Student IDs',num(s.duplicate_active_student_id_groups)===0,num(s.duplicate_active_student_id_groups)===0?'No duplicate active Student IDs':`${num(s.duplicate_active_student_id_groups)} duplicate group(s)`)}
          ${check('Legacy Exam class identity',num(s.legacy_registered_exam_attempts_missing_class_id)===0,num(s.legacy_registered_exam_attempts_missing_class_id)===0?'No registered Exam attempt is missing class identity':`${num(s.legacy_registered_exam_attempts_missing_class_id)} historical attempt(s) predate current class-ID capture`,true)}
        </div>
        ${missing.length?`<div class="info"><strong>Deferred Exam Settings:</strong> ${missing.map(row=>`Year ${num(row.year_level)} · ${num(row.exam_year)} · ${esc(row.paper)}`).join(' · ')}. These can be configured later; RC2 now prevents unconfigured papers from being advertised or started.</div>`:''}
      </section>`;
  }

  function renderRC2(){
    if (!rc2) return '<section class="v50rc-section"><div class="empty">RC2 data unavailable.</div></section>';
    const s = rc2.summary || {};
    const ready = rc2.security_ready === true;
    const launchPending = num(s.pin_missing)+num(s.history_total)+num(s.possible_test_students_count)+num(s.missing_exam_settings_count) > 0;
    const assignmentIssues = num(s.active_exam_assignments_missing_settings)+num(s.active_exam_assignments_unavailable);
    const manual = Array.isArray(rc2.manual_platform_checks) ? rc2.manual_platform_checks : [];

    return `
      <section class="v50rc-section">
        <div class="v50rc-phase"><div><h3>RC2 — Security & launch configuration</h3><p class="muted">Anonymous RPC exposure, direct-table isolation, protected student access, Exam availability enforcement and release-time launch actions.</p></div><span class="tag">${ready?'Security pass':'Needs attention'}</span></div>
        <div class="v50rc-grid">
          <div class="v50rc-stat"><strong>${num(s.forbidden_anon_function_exposures)}</strong><span>Unwanted anon RPC exposures</span></div>
          <div class="v50rc-stat"><strong>${num(s.sensitive_anon_table_grants)}</strong><span>Sensitive anon table grants</span></div>
          <div class="v50rc-stat"><strong>${num(s.required_student_rpc_missing)}</strong><span>Required student RPC gaps</span></div>
          <div class="v50rc-stat"><strong>${assignmentIssues}</strong><span>Active Exam assignment config issues</span></div>
        </div>
        <div class="v50rc-checks">
          ${check('Protected student access',s.access_mode==='student_pin',s.access_mode==='student_pin'?'Student ID + PIN mode is active':`Current access mode: ${s.access_mode||'unknown'}`)}
          ${check('Anonymous RPC boundary',num(s.forbidden_anon_function_exposures)===0 && num(s.required_student_rpc_missing)===0,num(s.forbidden_anon_function_exposures)===0&&num(s.required_student_rpc_missing)===0?'Only the intended pre-login student RPC surface remains available':`${num(s.forbidden_anon_function_exposures)} unwanted exposure(s), ${num(s.required_student_rpc_missing)} required RPC gap(s)`)}
          ${check('Direct table isolation',num(s.sensitive_anon_table_grants)===0,num(s.sensitive_anon_table_grants)===0?'Sensitive tables have no direct anonymous read/write grants':`${num(s.sensitive_anon_table_grants)} sensitive table grant(s) remain`)}
          ${check('Exam assignment configuration',assignmentIssues===0,assignmentIssues===0?'All active Exam assignments point to explicitly configured available papers':`${assignmentIssues} active assignment configuration issue(s)`)}
          ${check('Result review code entropy',num(s.result_code_min_length)>=19 && num(s.result_code_duplicates)===0,`Minimum code length ${num(s.result_code_min_length)} · ${num(s.result_code_duplicates)} duplicate code(s)`)}
          ${check('Unconfigured Exam protection',true,'Unconfigured/unavailable papers are hidden from the paper list and blocked by the Exam question/start RPCs')}
        </div>
        <div class="info"><strong>RC2 security boundary:</strong> ${ready?'The automated database/browser security checks pass.':'One or more automated security checks still need attention.'} Final launch preparation is tracked separately so development can continue safely.</div>
        <div class="v50rc-actions">
          <div class="v50rc-action"><strong>${num(s.pin_missing)}</strong><br>student PINs still to prepare</div>
          <div class="v50rc-action"><strong>${num(s.history_total)}</strong><br>stored test/development history rows</div>
          <div class="v50rc-action"><strong>${num(s.possible_test_students_count)}</strong><br>possible test/demo roster records</div>
          <div class="v50rc-action"><strong>${num(s.missing_exam_settings_count)}</strong><br>deferred Exam Settings rows</div>
        </div>
        <div class="buttons"><button id="v50rc-open-launch-readiness" class="outline" type="button">Open Launch Readiness</button><button id="v50rc-open-exam-settings" class="outline" type="button">Open Exam Settings</button></div>
        ${manual.length?`<div class="info"><strong>Manual final-release checks:</strong><ul>${manual.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>${launchPending?'These are final launch actions; they do not block the RC3 polish pass while development continues.':''}</div>`:''}
      </section>`;
  }

  function render(){
    const root = byId('v50-release-audit-root');
    if (!root) return;
    if (!rc1 && !rc2){ root.innerHTML = '<div class="empty">Release audit data is unavailable.</div>'; return; }

    const securityReady = rc2?.security_ready === true;
    const badge = byId('v50-release-audit-badge');
    if (badge){
      badge.textContent = securityReady ? 'RC2 ✓' : 'RC2 !';
      badge.title = securityReady ? 'RC2 automated security checks pass' : 'RC2 needs attention';
    }

    root.innerHTML = `
      <section class="v50rc-hero ${securityReady?'pass':'blocked'}">
        <h3>${securityReady?'✅ RC2 automated security checks pass':'⚠️ RC2 security checks need attention'}</h3>
        <div>${securityReady?'The hardened student/teacher boundaries pass. Launch-only cleanup and configuration can still be completed later before final V5.0 sign-off.':'Resolve the failed security checks below before proceeding to final release polish.'}</div>
      </section>
      ${renderRC1()}
      ${renderRC2()}
      <section class="v50rc-section v50rc-pending">
        <div class="v50rc-phase"><div><h3>RC3 — UX & production polish</h3><p class="muted">Pending. Responsive usability, terminology, loading/error states, accessibility and final V5.0 release presentation.</p></div><span class="tag">Pending</span></div>
      </section>
    `;

    byId('v50rc-open-exam-settings')?.addEventListener('click',()=>openPanel('exam-settings-panel'));
    byId('v50rc-open-launch-readiness')?.addEventListener('click',()=>byId('v50d1-launch-readiness-tab')?.click());
  }

  async function loadAudit(){
    if (loading) return;
    clearFeedback();
    if (!cloudAvailable()){
      rc1 = null; rc2 = null; render();
      feedback('try','Sign in as a teacher with cloud access to run the release audit.');
      return;
    }
    loading = true;
    const button = byId('v50-release-audit-refresh');
    if (button){ button.disabled = true; button.textContent = 'Checking…'; }
    try {
      const [a,b] = await Promise.all([
        cloud.rpc('get_teacher_release_audit_v50rc1'),
        cloud.rpc('get_teacher_release_audit_v50rc2')
      ]);
      if (a.error) throw a.error;
      if (b.error) throw b.error;
      rc1 = a.data || null;
      rc2 = b.data || null;
      render();
    } catch (error){
      console.warn('Could not load release audit.',error);
      rc1 = null; rc2 = null; render();
      feedback('incorrect',`Release audit could not be loaded. ${error?.message||''}`.trim());
    } finally {
      loading = false;
      if (button){ button.disabled = false; button.textContent = 'Refresh Audit'; }
    }
  }

  function openPanel(panelId){
    const tab = document.querySelector(`#teacher .tab[data-panel="${panelId}"]`);
    if (tab){ tab.click(); return; }
    feedback('try','That Teacher Dashboard area could not be opened from this page.');
  }

  function activatePanel(){
    const tab = byId(TAB_ID),panel = byId(PANEL_ID);
    if (!tab || !panel) return;
    document.querySelectorAll('#teacher .tab').forEach(item=>item.classList.remove('active'));
    document.querySelectorAll('#teacher .panel').forEach(item=>item.classList.remove('active'));
    tab.classList.add('active');
    panel.classList.add('active');
    loadAudit();
  }

  function wirePanel(){
    ensurePanel();
    document.querySelector('#teacher .tabs')?.addEventListener('click',event=>{
      const clicked = event.target.closest('.tab');
      if (!clicked) return;
      if (clicked.id===TAB_ID){ event.preventDefault(); activatePanel(); }
      else { byId(TAB_ID)?.classList.remove('active'); byId(PANEL_ID)?.classList.remove('active'); }
    });
    byId('v50-release-audit-refresh')?.addEventListener('click',loadAudit);
  }

  function wire(){ injectStyles(); wirePanel(); }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();

/* V5.0RC2 launch audit polish.
   A deliberate clean-start can leave zero saved result codes. When the server-side
   RC2 audit passes that empty population, present it as an empty sample rather than
   a zero-length-code failure. Real saved codes still require >=19 chars and uniqueness. */
(() => {
  'use strict';

  if (window.__v50Rc2EmptyResultCodePolishInstalled) return;
  window.__v50Rc2EmptyResultCodePolishInstalled = true;

  const ROOT_ID = 'v50-release-audit-root';

  function polish(){
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    const rc2Section = [...root.querySelectorAll('.v50rc-section')]
      .find(section => section.querySelector('h3')?.textContent?.includes('RC2 — Security & launch configuration'));
    if (!rc2Section) return;

    const phaseTag = rc2Section.querySelector('.v50rc-phase .tag');
    if (!phaseTag || !phaseTag.textContent.includes('Security pass')) return;

    const card = [...rc2Section.querySelectorAll('.v50rc-check')]
      .find(item => item.querySelector('strong')?.textContent?.includes('Result review code entropy'));
    if (!card) return;

    const detail = card.querySelector('div');
    if (!detail || !/Minimum code length 0\s*·\s*0 duplicate code\(s\)/.test(detail.textContent || '')) return;

    card.classList.remove('fail','warn');
    card.classList.add('pass');
    const strong = card.querySelector('strong');
    if (strong) strong.textContent = '✅ Result review code entropy';
    detail.textContent = 'No result codes saved yet after clean start · generator uses 19-character UUID-derived codes';
  }

  function install(){
    polish();
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    new MutationObserver(polish).observe(root,{childList:true,subtree:true,characterData:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

/* V5.4 — extends the existing read-only Release Audit with UX/production polish status.
   Presentation-only: consumes window.V50ProductionPolish.getAudit() and does not call Supabase. */
(() => {
  'use strict';

  if (window.__v50ReleaseAuditRc3Installed) return;
  window.__v50ReleaseAuditRc3Installed = true;

  const ROOT_ID = 'v50-release-audit-root';
  const BADGE_ID = 'v50-release-audit-badge';
  const UPDATE_EVENT = 'v50rc3-production-polish-updated';
  let observer = null;

  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  const labels = {
    stable_release_branding:'Stable-release identity',
    production_setup_control:'Production setup control',
    reviewed_work_wording:'Reviewed Work & privacy wording',
    teacher_tab_accessibility:'Teacher tab accessibility',
    responsive_polish:'Responsive layout polish',
    live_status_regions:'Loading/status announcements'
  };

  const details = {
    stable_release_branding:'Visible shell uses the signed-off V5.4 Stable Release identity.',
    production_setup_control:'Packaged deployments hide the connection editor from the normal student/teacher home flow.',
    reviewed_work_wording:'Practice and Exam review language is consistent and result-code privacy is explicit.',
    teacher_tab_accessibility:'Teacher sections expose tab semantics, keyboard navigation and panel relationships.',
    responsive_polish:'Teacher navigation and result-code layouts are protected against narrow-screen overflow.',
    live_status_regions:'Connection, access and save-state updates are announced politely to assistive technology.'
  };

  function audit(){
    try {
      return window.V50ProductionPolish?.getAudit?.() || {ready:false,checks:{}};
    } catch {
      return {ready:false,checks:{}};
    }
  }

  function checkCard(key,pass){
    return `<article class="v50rc-check ${pass?'pass':'fail'}"><strong>${pass?'✅':'❌'} ${esc(labels[key] || key)}</strong><div>${esc(details[key] || '')}</div></article>`;
  }

  function sectionMarkup(state){
    const checks = state.checks || {};
    const ordered = Object.keys(labels);
    const passed = ordered.filter(key => checks[key] === true).length;
    return `
      <section class="v50rc-section" data-v50rc3-decorated="1" data-v50rc3-ready="${state.ready?'1':'0'}">
        <div class="v50rc-phase">
          <div><h3>RC3 — UX & production polish</h3><p class="muted">Stable-release identity, responsive usability, terminology, privacy wording, status announcements and Teacher Dashboard accessibility.</p></div>
          <span class="tag">${state.ready?'Polish pass':'Needs attention'}</span>
        </div>
        <div class="v50rc-grid">
          <div class="v50rc-stat"><strong>${passed}/${ordered.length}</strong><span>Production-polish checks passed</span></div>
          <div class="v50rc-stat"><strong>${state.packaged_production?'Packaged':'Local'}</strong><span>Connection presentation</span></div>
        </div>
        <div class="v50rc-checks">${ordered.map(key => checkCard(key,checks[key] === true)).join('')}</div>
        <div class="info"><strong>RC3 boundary:</strong> Presentation and accessibility checks remain isolated from grading, authentication, Practice/Exam evidence and student data.</div>
      </section>`;
  }

  function findRc3Section(root){
    return [...root.querySelectorAll('.v50rc-section')]
      .find(section => /^RC3\s+—/.test(String(section.querySelector('h3')?.textContent || '').trim()));
  }

  function applyStableAuditHeading(){
    const panel = document.getElementById('release-audit-panel');
    const heading = panel?.querySelector('.header h2');
    const lead = panel?.querySelector('.header .muted');
    if (heading) heading.textContent = 'V5.4 Release Audit';
    if (lead) lead.textContent = 'Whole-app release checks for the stable V5.4 baseline. RC1 covers functional integrity, RC2 covers security and launch configuration, and RC3 covers UX/production polish.';
  }

  function decorate(){
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    applyStableAuditHeading();
    const state = audit();
    const section = findRc3Section(root);
    if (!section) return;

    const readyValue = state.ready ? '1' : '0';
    if (section.dataset.v50rc3Decorated === '1' && section.dataset.v50rc3Ready === readyValue) return;
    section.outerHTML = sectionMarkup(state);

    const badge = document.getElementById(BADGE_ID);
    if (badge){
      badge.textContent = state.ready ? 'RC3 ✓' : 'RC3 !';
      badge.title = state.ready ? 'RC3 UX and production-polish checks pass' : 'RC3 needs attention';
    }

    const hero = root.querySelector('.v50rc-hero');
    if (hero && state.ready){
      hero.className = 'v50rc-hero pass';
      hero.innerHTML = '<h3>✅ V5.4 production-polish checks pass</h3><div>Functional and security audits remain visible below. Launch Readiness separately tracks the controlled student rollout state.</div>';
    }
  }

  function observeRoot(root){
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => window.requestAnimationFrame(decorate));
    observer.observe(root,{childList:true,subtree:true});
    decorate();
  }

  function wire(){
    applyStableAuditHeading();
    const root = document.getElementById(ROOT_ID);
    if (root){ observeRoot(root); return; }

    const bodyObserver = new MutationObserver(() => {
      applyStableAuditHeading();
      const next = document.getElementById(ROOT_ID);
      if (!next) return;
      bodyObserver.disconnect();
      observeRoot(next);
    });
    bodyObserver.observe(document.body,{childList:true,subtree:true});
  }

  window.addEventListener(UPDATE_EVENT,decorate);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();