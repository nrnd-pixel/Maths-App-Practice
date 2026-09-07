/* Current release identity.
   The numeric version is derived from config.js's actual staged script list so
   release UI cannot silently fall one patch behind the runtime that is loaded. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;

  function versionPartsFromScript(src){
    const file = String(src ?? '')
      .split(/[?#]/,1)[0]
      .split('/')
      .pop() || '';
    const match = file.match(/^v(\d+)/i);
    if (!match) return null;
    return match[1].split('').map(Number);
  }

  function compareParts(left,right){
    const length = Math.max(left.length,right.length);
    for (let index = 0; index < length; index += 1){
      const a = left[index] ?? 0;
      const b = right[index] ?? 0;
      if (a !== b) return a - b;
    }
    return 0;
  }

  function deriveCurrentVersion(scriptSources){
    let winner = null;
    for (const src of Array.isArray(scriptSources) ? scriptSources : []){
      const parts = versionPartsFromScript(src);
      if (!parts?.length) continue;
      if (!winner || compareParts(parts,winner) > 0) winner = parts;
    }
    return winner ? winner.join('.') : '';
  }

  function buildRelease(version){
    const clean = String(version || '').trim();
    if (!clean){
      return Object.freeze({
        version:'',
        label:'',
        title:'Math Practice',
        badge:'Current Version',
        releaseName:'Stable Release'
      });
    }
    return Object.freeze({
      version:clean,
      label:`V${clean}`,
      title:`Math Practice V${clean}`,
      badge:`Version ${clean} • Stable Release`,
      releaseName:'Stable Release'
    });
  }

  const stagedScripts = Array.isArray(ROOT.MATH_APP_STAGED_SCRIPTS)
    ? ROOT.MATH_APP_STAGED_SCRIPTS
    : [];
  const CURRENT_RELEASE = buildRelease(deriveCurrentVersion(stagedScripts));

  function applyIdentity(){
    if (typeof document === 'undefined') return false;

    document.title = CURRENT_RELEASE.title;

    const badge = document.querySelector('#start .brand .badge');
    if (badge) badge.textContent = CURRENT_RELEASE.badge;

    // Keep the existing start-screen introduction wording, but make its leading
    // release label follow the same derived identity when one is present.
    const introVersion = document.querySelector('#start > .info strong');
    if (introVersion && /^V\d/i.test(String(introVersion.textContent || '').trim())){
      introVersion.textContent = CURRENT_RELEASE.label
        ? `${CURRENT_RELEASE.label}:`
        : 'Current release:';
    }

    return document.title === CURRENT_RELEASE.title
      && (!badge || String(badge.textContent || '').trim() === CURRENT_RELEASE.badge);
  }

  const api = Object.freeze({
    CURRENT_RELEASE,
    deriveCurrentVersion,
    buildRelease,
    applyIdentity
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'MathAppVersion',{
      value:api,
      writable:false,
      configurable:false
    });
    applyIdentity();
  }
})();
