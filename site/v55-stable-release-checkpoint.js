/* V5.5 Stable Release Checkpoint.
   Presentation/audit-only consolidation after the accepted V5.5A-D Past Paper
   Practice sequence. No database, grading, auth, Practice retrieval, assignment,
   recommendation or Exam behavior changes. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v55StableReleaseCheckpointInstalled) return;
  ROOT.__v55StableReleaseCheckpointInstalled = true;

  const currentRelease = () => ROOT.MathAppVersion?.CURRENT_RELEASE || Object.freeze({
    title:'Math Practice',
    badge:'Current Version'
  });
  const AUDIT_ID = 'v55-stable-release-audit';
  const RELEASE_NOTE = `
    <strong>V5.5 Stable Release:</strong>
    Past Paper Practice now lets students choose a specific year and paper, use a Quick Session or practise All Available Questions in source order, safely resume longer same-device sessions, and save completed Practice work with the selected paper clearly identified for teacher results and exports.
    Mixed Practice, Topic Practice, deterministic grading, normal hints and second attempts, AI Learning Help, student access and Exam Mode remain within their established boundaries.
  `;

  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function moduleChecks(){
    return Object.freeze({
      past_paper_library:!!ROOT.__v55aPastPaperPracticeInstalled,
      full_available_practice:!!ROOT.__v55bFullPaperPracticeInstalled,
      resume_practice:!!ROOT.__v55cResumePastPaperPracticeInstalled && !!ROOT.__v55c1ResumeButtonBridgeInstalled,
      result_attribution:!!ROOT.__v55dPastPaperResultAttributionInstalled
    });
  }

  function identityReady(){
    if (typeof document === 'undefined') return false;
    const release = currentRelease();
    const badge = document.querySelector('#start .brand .badge');
    const note = document.querySelector('#start > .info');
    return document.title === release.title
      && String(badge?.textContent || '').trim() === release.badge
      && /V5\.5 Stable Release:/.test(String(note?.textContent || ''));
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
      [checks.past_paper_library,'V5.5A — Past Paper Practice','Specific year/paper Practice library is loaded.'],
      [checks.full_available_practice,'V5.5B — Session scope','Quick Session and All Available Questions are loaded.'],
      [checks.resume_practice,'V5.5C — Resume Practice','Same-device resume and the Next-button checkpoint bridge are loaded.'],
      [checks.result_attribution,'V5.5D — Result attribution','Past-paper year/paper attribution for completed Practice work is loaded.'],
      [identityReady(),'V5.5 checkpoint identity','Current app title/badge plus the V5.5 checkpoint release note are active.']
    ];
    const passed = rows.filter(row => row[0]).length;
    const ready = passed === rows.length;
    return `
      <div class="v50rc-phase">
        <div><h3>${ready?'✅ ':''}V5.5 stable checkpoint</h3><p class="muted">Accepted V5.5A-D Past Paper Practice sequence. The V5.4 RC1-RC3 functional, security and production-polish audits remain the underlying foundation below.</p></div>
        <span class="tag">${ready?'Checkpoint pass':'Needs attention'}</span>
      </div>
      <div class="v50rc-grid">
        <div class="v50rc-stat"><strong>${passed}/${rows.length}</strong><span>V5.5 checkpoint checks passed</span></div>
        <div class="v50rc-stat"><strong>${ready?'Stable':'Review'}</strong><span>Current release state</span></div>
      </div>
      <div class="v50rc-checks">${rows.map(row => auditCard(...row)).join('')}</div>
      <div class="info"><strong>V5.5 boundary:</strong> This checkpoint advances release identity and verifies the accepted Past Paper Practice layers only. It does not change Supabase data, grading, authentication, question retrieval or Exam Mode.</div>`;
  }

  function applyAuditSummary(){
    if (typeof document === 'undefined') return false;
    const panel = document.getElementById('release-audit-panel');
    if (!panel) return false;

    const heading = panel.querySelector('.header h2');
    const lead = panel.querySelector('.header .muted');
    if (heading) heading.textContent = 'V5.5 Release Audit';
    if (lead) lead.textContent = 'Stable V5.5 checkpoint for Past Paper Practice, with the established V5.4 functional, security and production-polish audits retained below.';

    let section = document.getElementById(AUDIT_ID);
    if (!section){
      section = document.createElement('section');
      section.id = AUDIT_ID;
      section.className = 'v50rc-section';
      const root = document.getElementById('v50-release-audit-root');
      if (root) root.insertAdjacentElement('beforebegin',section);
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
      version:'5.5',
      title:release.title,
      badge:release.badge,
      checks
    });
  }

  function scheduleApply(){
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    [0,80,220,600,1200].forEach(delay => window.setTimeout(apply,delay));
    document.addEventListener('click',event => {
      const control = event.target?.closest?.('[data-panel="release-audit-panel"]');
      if (control) window.setTimeout(applyAuditSummary,0);
    });
  }

  const api = Object.freeze({ apply, getStatus, applyAuditSummary });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V55StableReleaseCheckpoint',{
      value:api,
      writable:false,
      configurable:false
    });
    scheduleApply();
  }
})();
