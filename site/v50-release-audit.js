/* V5.0 Release Candidate Audit — RC1 functional regression surface.
   Read-only teacher diagnostics. RC2/RC3 sections are reserved for later passes. */
(() => {
  'use strict';

  if (window.__v50ReleaseAuditInstalled) return;
  window.__v50ReleaseAuditInstalled = true;

  const TAB_ID = 'v50-release-audit-tab';
  const PANEL_ID = 'release-audit-panel';
  const STYLE_ID = 'v50-release-audit-style';
  const FEEDBACK_ID = 'v50-release-audit-feedback';
  let snapshot = null;
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
      #${PANEL_ID} .v50rc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:14px 0}
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
      #${PANEL_ID} .v50rc-pending{opacity:.78}
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
          <div><h2>V5.0 Release Candidate Audit</h2><p class="muted">Final whole-app checks before the V5.0 release stamp. RC1 is functional regression; RC2 and RC3 follow afterwards.</p></div>
          <button id="v50-release-audit-refresh" class="secondary" type="button">Refresh Audit</button>
        </div>
        <div id="${FEEDBACK_ID}" class="feedback hidden" aria-live="polite"></div>
        <div id="v50-release-audit-root"><div class="empty">Open this area to run the RC1 functional checks.</div></div>
        <section class="v50rc-section v50rc-pending">
          <div class="v50rc-phase"><div><h3>RC2 — Security & launch configuration</h3><p class="muted">Pending. This pass will audit RPC exposure, RLS, authentication, launch configuration and repository/deployment safeguards.</p></div><span class="tag">Pending</span></div>
        </section>
        <section class="v50rc-section v50rc-pending">
          <div class="v50rc-phase"><div><h3>RC3 — UX & production polish</h3><p class="muted">Pending. This pass will cover responsive usability, terminology, loading/error states, accessibility and final V5.0 release presentation.</p></div><span class="tag">Pending</span></div>
        </section>
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

  function render(){
    const root = byId('v50-release-audit-root');
    if (!root) return;
    if (!snapshot){ root.innerHTML = '<div class="empty">RC1 audit data is unavailable.</div>'; return; }

    const s = snapshot.summary || {};
    const ready = snapshot.functional_ready === true;
    const active = num(s.active_exam_papers);
    const configured = num(s.configured_exam_papers);
    const available = num(s.available_exam_papers);
    const missing = Array.isArray(snapshot.missing_exam_settings) ? snapshot.missing_exam_settings : [];
    const integrityIssues =
      num(s.pending_review_count_mismatches) +
      num(s.exam_result_link_issues) +
      num(s.practice_assignment_link_issues) +
      num(s.answer_marks_out_of_bounds) +
      num(s.overdue_in_progress_exams) +
      num(s.duplicate_active_student_id_groups);
    const badge = byId('v50-release-audit-badge');
    if (badge){ badge.textContent = ready ? 'RC1 ✓' : 'RC1 !'; badge.title = ready ? 'RC1 functional checks pass' : 'RC1 needs attention'; }

    const missingHtml = missing.length ? `
      <section class="v50rc-section">
        <div class="v50rc-phase"><div><h3>Exam settings still required</h3><p class="muted">Every active Exam paper must be explicitly saved in Exam Settings before RC1 can pass. This avoids relying on hidden default behaviour.</p></div><button id="v50rc-open-exam-settings" class="outline" type="button">Open Exam Settings</button></div>
        ${missing.map(row=>`<div class="v50rc-missing">Year ${num(row.year_level)} · ${num(row.exam_year)} · ${esc(row.paper)}</div>`).join('')}
      </section>` : '';

    root.innerHTML = `
      <section class="v50rc-hero ${ready?'pass':'blocked'}">
        <h3>${ready?'✅ RC1 functional checks pass':'⚠️ RC1 needs attention'}</h3>
        <div>${ready
          ? 'The audited functional and live-data invariants currently pass. RC2 can begin.'
          : 'Resolve the failed RC1 checks below before moving to the security/configuration pass.'}</div>
      </section>
      <section class="v50rc-section">
        <div class="v50rc-phase"><div><h3>RC1 — Functional regression audit</h3><p class="muted">Practice/Exam data links, teacher-review synchronization, assignment integrity, score bounds and Exam configuration coverage.</p></div><span class="tag">${ready?'Pass':'In progress'}</span></div>
        <div class="v50rc-grid">
          <div class="v50rc-stat"><strong>${configured}/${active}</strong><span>Exam papers configured</span></div>
          <div class="v50rc-stat"><strong>${available}</strong><span>Configured papers available</span></div>
          <div class="v50rc-stat"><strong>${integrityIssues}</strong><span>Functional integrity issues</span></div>
          <div class="v50rc-stat"><strong>${num(s.legacy_registered_exam_attempts_missing_class_id)}</strong><span>Legacy class-ID warning</span></div>
        </div>
        <div class="v50rc-checks">
          ${check('Exam configuration',active>0 && configured===active,active?`${configured}/${active} active paper(s) explicitly configured`:'No active Exam papers found')}
          ${check('Exam availability',available>0,available?`${available} explicitly configured paper(s) available`:'No explicitly configured paper is available')}
          ${check('Pending-review synchronization',num(s.pending_review_count_mismatches)===0,num(s.pending_review_count_mismatches)===0?'Cached pending counts match answer rows':`${num(s.pending_review_count_mismatches)} session count mismatch(es)`)}
          ${check('Exam result links',num(s.exam_result_link_issues)===0,num(s.exam_result_link_issues)===0?'Exam attempts and saved result sessions are linked consistently':`${num(s.exam_result_link_issues)} link issue(s)`)}
          ${check('Practice assignment links',num(s.practice_assignment_link_issues)===0,num(s.practice_assignment_link_issues)===0?'Practice assignment attempts are linked consistently':`${num(s.practice_assignment_link_issues)} link issue(s)`)}
          ${check('Mark bounds',num(s.answer_marks_out_of_bounds)===0,num(s.answer_marks_out_of_bounds)===0?'No saved answer exceeds its mark bounds':`${num(s.answer_marks_out_of_bounds)} out-of-bounds answer mark(s)`)}
          ${check('Exam deadline states',num(s.overdue_in_progress_exams)===0,num(s.overdue_in_progress_exams)===0?'No in-progress Exam is already past its deadline':`${num(s.overdue_in_progress_exams)} overdue in-progress Exam(s)`)}
          ${check('Active Student IDs',num(s.duplicate_active_student_id_groups)===0,num(s.duplicate_active_student_id_groups)===0?'No duplicate active Student IDs':`${num(s.duplicate_active_student_id_groups)} duplicate active Student ID group(s)`)}
          ${check('Legacy Exam class identity',num(s.legacy_registered_exam_attempts_missing_class_id)===0,num(s.legacy_registered_exam_attempts_missing_class_id)===0?'No registered Exam attempt is missing class identity':`${num(s.legacy_registered_exam_attempts_missing_class_id)} historical attempt(s) predate current class-ID capture`,true)}
        </div>
        <div class="info"><strong>RC1 boundary:</strong> the legacy class-ID item is informational only. Current secure Exam creation/resume writes class identity from the verified access ticket, and historical test activity will be removed later by the deliberate clean-start workflow.</div>
      </section>
      ${missingHtml}
    `;

    byId('v50rc-open-exam-settings')?.addEventListener('click',openExamSettings);
  }

  async function loadAudit(){
    if (loading) return;
    clearFeedback();
    if (!cloudAvailable()){
      snapshot = null;
      render();
      feedback('try','Sign in as a teacher with cloud access to run the release audit.');
      return;
    }
    loading = true;
    const button = byId('v50-release-audit-refresh');
    if (button){ button.disabled = true; button.textContent = 'Checking…'; }
    try {
      const {data,error} = await cloud.rpc('get_teacher_release_audit_v50rc1');
      if (error) throw error;
      snapshot = data || null;
      render();
    } catch (error){
      console.warn('Could not load release audit.',error);
      snapshot = null;
      render();
      feedback('incorrect',`Release audit could not be loaded. ${error?.message||''}`.trim());
    } finally {
      loading = false;
      if (button){ button.disabled = false; button.textContent = 'Refresh Audit'; }
    }
  }

  function openExamSettings(){
    const tab = document.querySelector('#teacher .tab[data-panel="exam-settings-panel"]');
    if (tab){ tab.click(); return; }
    feedback('try','Exam Settings could not be opened from this page.');
  }

  function activatePanel(){
    const tab = byId(TAB_ID);
    const panel = byId(PANEL_ID);
    if (!tab || !panel) return;
    document.querySelectorAll('#teacher .tab').forEach(item=>item.classList.remove('active'));
    document.querySelectorAll('#teacher .panel').forEach(item=>item.classList.remove('active'));
    tab.classList.add('active');
    panel.classList.add('active');
    loadAudit();
  }

  function wirePanel(){
    ensurePanel();
    const tabs = document.querySelector('#teacher .tabs');
    tabs?.addEventListener('click',event=>{
      const clicked = event.target.closest('.tab');
      if (!clicked) return;
      if (clicked.id===TAB_ID){
        event.preventDefault();
        activatePanel();
      } else {
        byId(TAB_ID)?.classList.remove('active');
        byId(PANEL_ID)?.classList.remove('active');
      }
    });
    byId('v50-release-audit-refresh')?.addEventListener('click',loadAudit);
  }

  function wire(){
    injectStyles();
    wirePanel();
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
