/* V5.7E — V5.7 Stable Release Checkpoint.
   Presentation/audit-only consolidation after the accepted V5.7A-D sequence.
   No database, grading, authentication, Practice retrieval, assignment-write,
   result-write, question-write or Exam behavior changes. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v57StableReleaseCheckpointInstalled) return;
  ROOT.__v57StableReleaseCheckpointInstalled = true;

  const currentRelease = () => ROOT.MathAppVersion?.CURRENT_RELEASE || Object.freeze({
    title:'Math Practice',
    badge:'Current Version'
  });
  const AUDIT_ID = 'v57-stable-release-audit';
  const RELEASE_NOTE = `
    <strong>V5.7 Stable Release:</strong>
    Students can continue Past Paper Practice across devices and return to the most useful next learning action from Home. Teachers can manage Past Paper assignments more clearly and turn paper analytics into prepared student cohorts or a reusable teaching focus plan. The Practice-first student entry remains active, while the existing Exam engine, publication controls, attempts and historical results stay preserved behind the accepted hidden student entry point.
  `;

  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function moduleChecks(){
    return Object.freeze({
      cross_device_resume:!!ROOT.__v57aCrossDevicePastPaperResumeInstalled
        && !!ROOT.__v57a1CrossDeviceLocalBridgeInstalled
        && !!ROOT.__v57a2StaleLocalCheckpointCleanupInstalled,
      teacher_assignment_management:!!ROOT.__v57bTeacherAssignmentManagementInstalled,
      continue_learning_home:!!ROOT.__v57cStudentContinueLearningHomeInstalled,
      analytics_actions:!!ROOT.__v57dPastPaperAnalyticsActionsInstalled
        && !!ROOT.__v57d1FocusPlanCopyFallbackInstalled,
      practice_first_foundation:!!ROOT.__v561PracticeFirstStudentExperienceInstalled
        && !!ROOT.__v56StableReleaseCheckpointInstalled
    });
  }

  function identityReady(){
    if (typeof document === 'undefined') return false;
    const release = currentRelease();
    const badge = document.querySelector('#start .brand .badge');
    const note = document.querySelector('#start > .info');
    return document.title === release.title
      && String(badge?.textContent || '').trim() === release.badge
      && /V5\.7 Stable Release:/.test(String(note?.textContent || ''));
  }

  function applyIdentity(){
    if (typeof document === 'undefined') return false;
    ROOT.MathAppVersion?.applyIdentity?.();
    const note = document.querySelector('#start > .info');
    if (note) note.innerHTML = RELEASE_NOTE;
    return identityReady();
  }

  function auditCard(pass,title,detail){
    return `<article class="v50rc-check ${pass?'pass':'fail'}"><strong>${pass?'✅':'❌'} ${esc(title)}</strong><div>${esc(detail)}</div></article>`;
  }

  function auditMarkup(){
    const checks = moduleChecks();
    const rows = [
      [checks.cross_device_resume,'V5.7A — Cross-device Past Paper Resume','Secure server-backed checkpoints, the accepted same-device bridge and stale local-checkpoint cleanup are loaded.'],
      [checks.teacher_assignment_management,'V5.7B — Teacher Assignment Management','Completion tracking, schedule editing, close/reopen and reassign-as-new controls are loaded.'],
      [checks.continue_learning_home,'V5.7C — Continue Learning Home','Saved Practice, teacher work, recommendations and recent Practice are prioritised on the signed-in Home screen.'],
      [checks.analytics_actions,'V5.7D — Past Paper Analytics Actions','Prepared cohorts, assignment management, teaching focus plans and the selectable copy fallback are loaded.'],
      [checks.practice_first_foundation,'Practice-first foundation','The accepted V5.6 stable checkpoint and V5.6.1 Practice-first student entry remain active.'],
      [identityReady(),'V5.7 checkpoint identity','Current app title/badge plus the V5.7 checkpoint release note are active.']
    ];
    const passed = rows.filter(row => row[0]).length;
    const ready = passed === rows.length;
    return `
      <div class="v50rc-phase">
        <div><h3>${ready?'✅ ':''}V5.7 stable checkpoint</h3><p class="muted">Accepted V5.7A-D continuation, assignment-management and analytics-action sequence. The V5.6, V5.5 and V5.4 audit foundations remain retained below.</p></div>
        <span class="tag">${ready?'Checkpoint pass':'Needs attention'}</span>
      </div>
      <div class="v50rc-grid">
        <div class="v50rc-stat"><strong>${passed}/${rows.length}</strong><span>V5.7 checkpoint checks passed</span></div>
        <div class="v50rc-stat"><strong>${ready?'Stable':'Review'}</strong><span>Current release state</span></div>
      </div>
      <div class="v50rc-checks">${rows.map(row => auditCard(...row)).join('')}</div>
      <div class="info"><strong>V5.7 boundary:</strong> This checkpoint advances release identity and verifies the accepted V5.7A-D layers only. It does not make network calls or change Supabase data, grading, authentication, Practice retrieval, assignment/result/question writes or the preserved Exam engine.</div>`;
  }

  function applyAuditSummary(){
    if (typeof document === 'undefined') return false;
    const panel = document.getElementById('release-audit-panel');
    if (!panel) return false;

    const heading = panel.querySelector('.header h2');
    const lead = panel.querySelector('.header .muted');
    if (heading) heading.textContent = 'V5.7 Release Audit';
    if (lead) lead.textContent = 'Stable V5.7 checkpoint for cross-device continuity, assignment management, Continue Learning and analytics actions, with the accepted V5.6, V5.5 and V5.4 audit foundations retained below.';

    let section = document.getElementById(AUDIT_ID);
    if (!section){
      section = document.createElement('section');
      section.id = AUDIT_ID;
      section.className = 'v50rc-section';
      const v56 = document.getElementById('v56-stable-release-audit');
      const v55 = document.getElementById('v55-stable-release-audit');
      const root = document.getElementById('v50-release-audit-root');
      if (v56) v56.insertAdjacentElement('beforebegin',section);
      else if (v55) v55.insertAdjacentElement('beforebegin',section);
      else if (root) root.insertAdjacentElement('beforebegin',section);
      else panel.appendChild(section);
    }
    section.innerHTML = auditMarkup();
    return true;
  }

  function apply(){
    const identity = applyIdentity();
    applyAuditSummary();
    return identity;
  }

  function getStatus(){
    const checks = moduleChecks();
    const modulesReady = Object.values(checks).every(Boolean);
    const release = currentRelease();
    return Object.freeze({
      ready:identityReady() && modulesReady,
      version:'5.7',
      title:release.title,
      badge:release.badge,
      checks
    });
  }

  function scheduleApply(){
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    /* Final passes run after the V5.6 stable identity burst and V5.6.1 rollout
       notice so the current config-derived identity remains authoritative. */
    [0,100,300,900,1800,2600,3200].forEach(delay => window.setTimeout(apply,delay));
    document.addEventListener('click',event => {
      const control = event.target?.closest?.('[data-panel="release-audit-panel"]');
      if (control) window.setTimeout(applyAuditSummary,0);
    });
  }

  const api = Object.freeze({ apply, getStatus, applyAuditSummary });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V57StableReleaseCheckpoint',{
      value:api,
      writable:false,
      configurable:false
    });
    scheduleApply();
  }
})();
