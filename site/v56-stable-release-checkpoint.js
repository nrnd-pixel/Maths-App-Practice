/* V5.6E — V5.6 Stable Release Checkpoint.
   Presentation/audit-only consolidation after the accepted V5.6A-D sequence.
   No database, grading, authentication, Practice retrieval, assignment-write,
   result-write, question-write or Exam behavior changes. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v56StableReleaseCheckpointInstalled) return;
  ROOT.__v56StableReleaseCheckpointInstalled = true;

  const TITLE = 'Math Practice V5.6';
  const BADGE = 'Version 5.6 • Stable Release';
  const AUDIT_ID = 'v56-stable-release-audit';
  const RELEASE_NOTE = `
    <strong>V5.6 Stable Release:</strong>
    Teachers can safely filter Question Bank items by response type, assign specific Past Paper Practice to classes or students, and analyse paper-level class performance. Students can track Past Paper progress, continue saved work on the same device, and revisit completed papers. The established V5.5 Past Paper Practice engine, grading, hints, AI Learning Help, student access and Exam Mode remain within their accepted boundaries.
  `;

  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function moduleChecks(){
    return Object.freeze({
      response_filter:!!ROOT.__v56aQuestionBankResponseFilterInstalled && !!ROOT.__v56a1BulkPracticeConfirmationBridgeInstalled,
      teacher_assignment:!!ROOT.__v56bTeacherAssignedPastPaperPracticeInstalled,
      student_progress:!!ROOT.__v56cStudentPastPaperProgressInstalled,
      teacher_analytics:!!ROOT.__v56dTeacherPastPaperAnalyticsInstalled,
      v55_foundation:!!ROOT.__v55StableReleaseCheckpointInstalled
    });
  }

  function identityReady(){
    if (typeof document === 'undefined') return false;
    const badge = document.querySelector('#start .brand .badge');
    const note = document.querySelector('#start > .info');
    return document.title === TITLE
      && String(badge?.textContent || '').trim() === BADGE
      && /V5\.6 Stable Release:/.test(String(note?.textContent || ''));
  }

  function applyIdentity(){
    if (typeof document === 'undefined') return false;
    document.title = TITLE;
    const badge = document.querySelector('#start .brand .badge');
    if (badge) badge.textContent = BADGE;
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
      [checks.response_filter,'V5.6A — Question Bank response controls','Response-type filtering and reliable in-app bulk Practice confirmation are loaded.'],
      [checks.teacher_assignment,'V5.6B — Teacher-assigned Past Paper Practice','Teacher Past Paper assignment and student assignment flow are loaded.'],
      [checks.student_progress,'V5.6C — Student Past Paper Progress','Paper-level student progress, result links and same-device resume indicators are loaded.'],
      [checks.teacher_analytics,'V5.6D — Teacher Past Paper Analytics','Read-only class/paper progress, weak-question and topic/skill analytics are loaded.'],
      [identityReady(),'V5.6 stable-release identity','V5.6 title, badge and consolidated release note are active.']
    ];
    const passed = rows.filter(row => row[0]).length;
    const ready = passed === rows.length && checks.v55_foundation;
    return `
      <div class="v50rc-phase">
        <div><h3>${ready?'✅ ':''}V5.6 stable checkpoint</h3><p class="muted">Accepted V5.6A-D Past Paper management and visibility sequence. The V5.5 stable checkpoint and V5.4 RC audit foundation remain retained below.</p></div>
        <span class="tag">${ready?'Checkpoint pass':'Needs attention'}</span>
      </div>
      <div class="v50rc-grid">
        <div class="v50rc-stat"><strong>${passed}/${rows.length}</strong><span>V5.6 checkpoint checks passed</span></div>
        <div class="v50rc-stat"><strong>${ready?'Stable':'Review'}</strong><span>Current release state</span></div>
      </div>
      <div class="v50rc-checks">${rows.map(row => auditCard(...row)).join('')}</div>
      <div class="info"><strong>V5.6 boundary:</strong> This checkpoint advances release identity and verifies the accepted V5.6A-D layers only. It does not make network calls or change Supabase data, grading, authentication, Practice retrieval, assignment/result/question writes or Exam Mode.</div>`;
  }

  function applyAuditSummary(){
    if (typeof document === 'undefined') return false;
    const panel = document.getElementById('release-audit-panel');
    if (!panel) return false;

    const heading = panel.querySelector('.header h2');
    const lead = panel.querySelector('.header .muted');
    if (heading) heading.textContent = 'V5.6 Release Audit';
    if (lead) lead.textContent = 'Stable V5.6 checkpoint for Past Paper assignment, progress and analytics, with the accepted V5.5 and V5.4 audit foundations retained below.';

    let section = document.getElementById(AUDIT_ID);
    if (!section){
      section = document.createElement('section');
      section.id = AUDIT_ID;
      section.className = 'v50rc-section';
      const v55 = document.getElementById('v55-stable-release-audit');
      const root = document.getElementById('v50-release-audit-root');
      if (v55) v55.insertAdjacentElement('beforebegin',section);
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
    return Object.freeze({
      ready:identityReady() && modulesReady,
      version:'5.6',
      title:TITLE,
      badge:BADGE,
      checks
    });
  }

  function scheduleApply(){
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    [0,100,260,700,1400,1800].forEach(delay => window.setTimeout(apply,delay));
    document.addEventListener('click',event => {
      const control = event.target?.closest?.('[data-panel="release-audit-panel"]');
      if (control) window.setTimeout(applyAuditSummary,0);
    });
  }

  const api = Object.freeze({ apply, getStatus, applyAuditSummary });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V56StableReleaseCheckpoint',{
      value:api,
      writable:false,
      configurable:false
    });
    scheduleApply();
  }
})();
