/* V5.8 — Stable Release Checkpoint.
   Presentation/audit-only consolidation after the accepted V5.8A-D sequence.
   No database, grading, authentication, Practice retrieval, assignment-write,
   result-write, question-write, feedback-write or Exam behavior changes. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v58StableReleaseCheckpointInstalled) return;
  ROOT.__v58StableReleaseCheckpointInstalled = true;

  const currentRelease = () => ROOT.MathAppVersion?.CURRENT_RELEASE || Object.freeze({
    title:'Math Practice',
    badge:'Current Version'
  });
  const AUDIT_ID = 'v58-stable-release-audit';
  const RELEASE_NOTE = `
    <strong>V5.8 Stable Release:</strong>
    Students get a clearer first Practice experience while the accepted Practice-first Home, assignments, Past Paper continuity, gamification and classroom feedback remain intact. Teachers get a cleaner task-based workspace, a parent-friendly Practice progress summary and a consolidated content workflow that reuses the existing import, QA, Practice-availability, topical-publication and audit tools. The preserved Exam engine and Exam Settings remain available to teachers but are not promoted in the current student rollout.
  `;

  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function moduleChecks(){
    return Object.freeze({
      student_first_use:!!ROOT.__v58aStudentFirstUseExperienceInstalled,
      teacher_workspace:!!ROOT.__v58bTeacherWorkspaceInstalled,
      parent_friendly_report:!!ROOT.__v58cParentFriendlyStudentReportInstalled,
      content_workflow:!!ROOT.__v58dContentWorkflowInstalled,
      accepted_v57_foundation:!!ROOT.__v57StableReleaseCheckpointInstalled
        && !!ROOT.__v575GamificationStableCheckpointInstalled
        && !!ROOT.__v576ClassroomFeedbackSupportInstalled
    });
  }

  function identityReady(){
    if (typeof document === 'undefined') return false;
    const release = currentRelease();
    const badge = document.querySelector('#start .brand .badge');
    const note = document.querySelector('#start > .info');
    return document.title === release.title
      && String(badge?.textContent || '').trim() === release.badge
      && /V5\.8 Stable Release:/.test(String(note?.textContent || ''));
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
      [checks.student_first_use,'V5.8A — Student First-Use Experience','New learners are guided into the existing five-question Mixed Practice flow without changing grading, XP or assignment priority.'],
      [checks.teacher_workspace,'V5.8B — Teacher Workspace Consolidation','Task-grouped teacher navigation is loaded while the complete original teacher toolset remains preserved.'],
      [checks.parent_friendly_report,'V5.8C — Parent-Friendly Student Report','The teacher-only family summary is loaded from the established Student Performance Report snapshot and remains Practice-focused.'],
      [checks.content_workflow,'V5.8D — Content Workflow Consolidation','Import, validation, review, Practice availability, topical publication and audit are linked through the existing content tools.'],
      [checks.accepted_v57_foundation,'Accepted V5.7 foundation','The V5.7 stable checkpoint, gamification checkpoint and classroom feedback/support foundation remain loaded beneath V5.8.'],
      [identityReady(),'V5.8 stable-release identity','V5.8 title, badge and consolidated release note are active.']
    ];
    const passed = rows.filter(row => row[0]).length;
    const ready = passed === rows.length;
    return `
      <div class="v50rc-phase">
        <div><h3>${ready?'✅ ':''}V5.8 stable checkpoint</h3><p class="muted">Accepted V5.8A-D usability and workflow consolidation sequence. Earlier stable audit foundations remain retained below.</p></div>
        <span class="tag">${ready?'Checkpoint pass':'Needs attention'}</span>
      </div>
      <div class="v50rc-grid">
        <div class="v50rc-stat"><strong>${passed}/${rows.length}</strong><span>V5.8 checkpoint checks passed</span></div>
        <div class="v50rc-stat"><strong>${ready?'Stable':'Review'}</strong><span>Current release state</span></div>
      </div>
      <div class="v50rc-checks">${rows.map(row => auditCard(...row)).join('')}</div>
      <div class="info"><strong>V5.8 boundary:</strong> This checkpoint advances release identity and verifies the accepted V5.8A-D layers only. It makes no network calls and does not change Supabase data, grading, authentication, Practice retrieval, assignments, results, question content, feedback records, gamification rules or the preserved Exam engine.</div>`;
  }

  function applyAuditSummary(){
    if (typeof document === 'undefined') return false;
    const panel = document.getElementById('release-audit-panel');
    if (!panel) return false;

    const heading = panel.querySelector('.header h2');
    const lead = panel.querySelector('.header .muted');
    if (heading) heading.textContent = 'V5.8 Release Audit';
    if (lead) lead.textContent = 'Stable V5.8 checkpoint for first-use guidance, teacher workspace consolidation, parent-friendly reporting and content workflow clarity, with all earlier accepted audit foundations retained below.';

    let section = document.getElementById(AUDIT_ID);
    if (!section){
      section = document.createElement('section');
      section.id = AUDIT_ID;
      section.className = 'v50rc-section';
      const v57 = document.getElementById('v57-stable-release-audit');
      const v56 = document.getElementById('v56-stable-release-audit');
      const root = document.getElementById('v50-release-audit-root');
      if (v57) v57.insertAdjacentElement('beforebegin',section);
      else if (v56) v56.insertAdjacentElement('beforebegin',section);
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
      version:'5.8',
      title:release.title,
      badge:release.badge,
      checks
    });
  }

  function scheduleApply(){
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    /* V5.7.5's historical identity burst finishes at 4300ms. V5.8 must run after
       every retained checkpoint so its release identity is authoritative. */
    [0,120,420,1100,2200,3400,4600,5200].forEach(delay => window.setTimeout(apply,delay));
    document.addEventListener('click',event => {
      const control = event.target?.closest?.('[data-panel="release-audit-panel"]');
      if (control) window.setTimeout(applyAuditSummary,0);
    });
  }

  const api = Object.freeze({ apply, getStatus, applyAuditSummary });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V58StableReleaseCheckpoint',{
      value:api,
      writable:false,
      configurable:false
    });
    scheduleApply();
  }
})();
