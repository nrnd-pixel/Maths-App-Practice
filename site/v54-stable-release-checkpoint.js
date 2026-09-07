/* V5.4 Stable Release Checkpoint.
   Final presentation-only release identity after the accepted V5.4A–G Question Bank
   and unified Practice resource-bank sequence. No database, grading, auth, assignment,
   recommendation, Practice retrieval or Exam behavior changes. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v54StableReleaseCheckpointInstalled) return;
  ROOT.__v54StableReleaseCheckpointInstalled = true;

  const currentRelease = () => ROOT.MathAppVersion?.CURRENT_RELEASE || Object.freeze({
    title:'Math Practice',
    badge:'Current Version'
  });
  const RELEASE_NOTE = `
    <strong>V5.4 Stable Release:</strong>
    Students use two clear modes — Practice and Exam. The unified Practice resource bank now combines eligible past-paper and topical-exercise questions, while teachers have clear source/status visibility, individual and bulk Practice eligibility controls, compact 50-card Question Bank browsing, safe bulk-selection scope and whole-set topical management.
    Deterministic grading, AI-free Exam Mode, assignments, recommendations, reporting and reviewed-work boundaries remain unchanged.
  `;

  function applyIdentity(){
    if (typeof document === 'undefined') return false;

    try { ROOT.V50ProductionPolish?.refresh?.(); } catch {}
    ROOT.MathAppVersion?.applyIdentity?.();

    const releaseNote = document.querySelector('#start > .info');
    if (releaseNote) releaseNote.innerHTML = RELEASE_NOTE;

    const release = currentRelease();
    const badge = document.querySelector('#start .brand .badge');
    return document.title === release.title
      && String(badge?.textContent || '').trim() === release.badge
      && /V5\.4 Stable Release:/.test(String(releaseNote?.textContent || ''));
  }

  function getStatus(){
    if (typeof document === 'undefined'){
      const release = currentRelease();
      return Object.freeze({ready:false,title:release.title,badge:release.badge});
    }
    const release = currentRelease();
    const badge = document.querySelector('#start .brand .badge');
    const releaseNote = document.querySelector('#start > .info');
    return Object.freeze({
      ready:document.title === release.title
        && String(badge?.textContent || '').trim() === release.badge
        && /V5\.4 Stable Release:/.test(String(releaseNote?.textContent || '')),
      title:release.title,
      badge:release.badge
    });
  }

  function scheduleApply(){
    if (typeof window === 'undefined') return;
    [0,80,220,600].forEach(delay=>window.setTimeout(applyIdentity,delay));
  }

  const api = Object.freeze({ apply:applyIdentity, getStatus });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V54StableReleaseCheckpoint',{
      value:api,
      writable:false,
      configurable:false
    });
    scheduleApply();
  }
})();
