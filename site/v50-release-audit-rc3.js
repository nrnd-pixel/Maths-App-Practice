/* V5.0RC3 — extends the existing read-only Release Audit with UX/production polish status.
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
    release_candidate_branding:'Release-candidate identity',
    production_setup_control:'Production setup control',
    reviewed_work_wording:'Reviewed Work & privacy wording',
    teacher_tab_accessibility:'Teacher tab accessibility',
    responsive_polish:'Responsive layout polish',
    live_status_regions:'Loading/status announcements'
  };

  const details = {
    release_candidate_branding:'Visible shell uses V5.0 Release Candidate rather than legacy V4.x identity.',
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
          <div><h3>RC3 — UX & production polish</h3><p class="muted">Release-candidate identity, responsive usability, terminology, privacy wording, status announcements and Teacher Dashboard accessibility.</p></div>
          <span class="tag">${state.ready?'Polish pass':'Needs attention'}</span>
        </div>
        <div class="v50rc-grid">
          <div class="v50rc-stat"><strong>${passed}/${ordered.length}</strong><span>Production-polish checks passed</span></div>
          <div class="v50rc-stat"><strong>${state.packaged_production?'Packaged':'Local'}</strong><span>Connection presentation</span></div>
        </div>
        <div class="v50rc-checks">${ordered.map(key => checkCard(key,checks[key] === true)).join('')}</div>
        <div class="info"><strong>RC3 boundary:</strong> This phase changes presentation and accessibility only. Final V5.0 sign-off still waits for the deliberate launch actions tracked in RC1/RC2.</div>
      </section>`;
  }

  function findRc3Section(root){
    return [...root.querySelectorAll('.v50rc-section')]
      .find(section => /^RC3\s+—/.test(String(section.querySelector('h3')?.textContent || '').trim()));
  }

  function decorate(){
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
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
      hero.innerHTML = '<h3>✅ RC3 production-polish checks pass</h3><div>Functional and security audits remain visible below. Deferred Exam Settings and final launch cleanup are still intentionally tracked before V5.0 sign-off.</div>';
    }
  }

  function observeRoot(root){
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => window.requestAnimationFrame(decorate));
    observer.observe(root,{childList:true,subtree:true});
    decorate();
  }

  function wire(){
    const root = document.getElementById(ROOT_ID);
    if (root){ observeRoot(root); return; }

    const bodyObserver = new MutationObserver(() => {
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
