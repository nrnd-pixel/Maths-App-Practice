/* V5.7.5 — Gamification Stable Release Checkpoint.
   Presentation/audit-only consolidation of the accepted V5.7.1A through V5.7.4
   gamification sequence. No network calls, Supabase writes, grading, authentication,
   Practice retrieval, assignment/result/question writes or Exam behavior changes. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v575GamificationStableCheckpointInstalled) return;
  ROOT.__v575GamificationStableCheckpointInstalled = true;

  const currentRelease = () => ROOT.MathAppVersion?.CURRENT_RELEASE || Object.freeze({
    title:'Math Practice',
    badge:'Current Version'
  });
  const AUDIT_ID = 'v575-gamification-stable-audit';
  const RELEASE_NOTE = `
    <strong>V5.7.5 Gamified Practice Release:</strong>
    Practice-first learning now includes server-derived XP and levels, gentle streaks, achievement badges, weekly missions and a cooperative class challenge. Teachers can review class motivation without ranking students and can safely enable, pause or tune the cooperative challenge target. Continue Learning, Past Paper Practice, assignments and the preserved hidden Exam infrastructure remain within their accepted V5.7 boundaries.
  `;

  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function moduleChecks(){
    return Object.freeze({
      xp_levels:!!ROOT.__v571aGamificationFoundationInstalled,
      streaks_badges:!!ROOT.__v571bStreaksAchievementsInstalled,
      weekly_missions:!!ROOT.__v572WeeklyMissionsInstalled,
      class_challenge:!!ROOT.__v573ClassChallengesTeacherGamificationInstalled,
      teacher_controls:!!ROOT.__v574GamificationPolishTeacherControlsInstalled,
      v57_foundation:!!ROOT.__v57StableReleaseCheckpointInstalled
    });
  }

  function identityReady(){
    if (typeof document === 'undefined') return false;
    const release = currentRelease();
    const badge = document.querySelector('#start .brand .badge');
    const note = document.querySelector('#start > .info');
    return document.title === release.title
      && String(badge?.textContent || '').trim() === release.badge
      && /V5\.7\.5 Gamified Practice Release:/.test(String(note?.textContent || ''));
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
      [checks.xp_levels,'V5.7.1A — XP + Levels','Read-only XP and level progress are derived from verified saved Practice activity; Exam activity remains excluded.'],
      [checks.streaks_badges,'V5.7.1B — Streaks + Achievements','Gentle Practice streaks and achievement badges are derived from saved non-Exam learning evidence.'],
      [checks.weekly_missions,'V5.7.2 — Weekly Missions','Three weekly Practice missions reset on Monday in Brunei time and use saved Practice evidence.'],
      [checks.class_challenge,'V5.7.3 — Cooperative Class Challenge','Students see aggregate teamwork progress only; teachers get an alphabetical motivation view without leaderboards.'],
      [checks.teacher_controls,'V5.7.4 — Gamification Polish + Teacher Controls','Teachers can enable/pause the class challenge and choose 5, 10, 15 or 20 questions per active student.'],
      [identityReady(),'V5.7.5 release identity','V5.7.5 title, badge and consolidated gamified Practice release note are active.']
    ];
    const passed = rows.filter(row => row[0]).length;
    const ready = passed === rows.length && checks.v57_foundation;
    return `
      <div class="v50rc-phase">
        <div><h3>${ready?'✅ ':''}V5.7.5 gamification stable checkpoint</h3><p class="muted">Accepted V5.7.1A–V5.7.4 gamification sequence. The V5.7, V5.6, V5.5 and V5.4 release-audit foundations remain retained below.</p></div>
        <span class="tag">${ready?'Checkpoint pass':'Needs attention'}</span>
      </div>
      <div class="v50rc-grid">
        <div class="v50rc-stat"><strong>${passed}/${rows.length}</strong><span>Gamification checkpoint checks passed</span></div>
        <div class="v50rc-stat"><strong>${ready?'Stable':'Review'}</strong><span>Current gamification state</span></div>
      </div>
      <div class="v50rc-checks">${rows.map(row => auditCard(...row)).join('')}</div>
      <div class="info"><strong>V5.7.5 boundary:</strong> This checkpoint advances presentation identity and verifies the accepted gamification layers only. It does not make network calls or change Supabase data, XP rules, grading, authentication, Practice retrieval, assignments, results, questions or the preserved Exam engine.</div>`;
  }

  function applyAuditSummary(){
    if (typeof document === 'undefined') return false;
    const panel = document.getElementById('release-audit-panel');
    if (!panel) return false;

    const heading = panel.querySelector('.header h2');
    const lead = panel.querySelector('.header .muted');
    if (heading) heading.textContent = 'V5.7.5 Release Audit';
    if (lead) lead.textContent = 'Stable gamified Practice checkpoint for XP, levels, streaks, badges, weekly missions and cooperative class motivation, with the accepted V5.7 and earlier audit foundations retained below.';

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
      version:'5.7.5',
      title:release.title,
      badge:release.badge,
      checks
    });
  }

  function scheduleApply(){
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    /* Run after the V5.7 stable identity burst so this checkpoint is the final
       presentation identity while leaving all functional gamification layers intact. */
    [0,120,420,1100,2200,3400,4300].forEach(delay => window.setTimeout(apply,delay));
    document.addEventListener('click',event => {
      const control = event.target?.closest?.('[data-panel="release-audit-panel"]');
      if (control) window.setTimeout(applyAuditSummary,0);
    });
  }

  const api = Object.freeze({ apply, getStatus, applyAuditSummary });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V575GamificationStableCheckpoint',{
      value:api,
      writable:false,
      configurable:false
    });
    scheduleApply();
  }
})();
