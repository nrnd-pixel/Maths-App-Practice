/* V5.3E1 — Topical resource-bank teacher UI cleanup.
   Presentation only: topical sets remain teacher-managed resource sources.
   The legacy V5.2C publication backend stays intact for rollback, but its
   obsolete student-publication controls are no longer shown to teachers. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v53e1TopicalResourceUiCleanupInstalled) return;
  ROOT.__v53e1TopicalResourceUiCleanupInstalled = true;

  const STYLE_ID = 'v53e1-topical-resource-ui-cleanup-style';
  const norm = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g,' ');

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #v52b-topical-library .v52c-publication{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function replaceExactText(root,from,to){
    if (!root) return false;
    const target = norm(from);
    const nodes = root.querySelectorAll('strong,.help,.tag');
    for (const node of nodes){
      if (norm(node.textContent) !== target) continue;
      if (node.textContent !== to) node.textContent = to;
      return true;
    }
    return false;
  }

  function decoratePanel(){
    const panel = document.getElementById('v52b-topical-library');
    if (!panel) return false;
    const title = panel.querySelector(':scope > .header strong');
    if (title && title.textContent !== 'Topical Exercise Resource Library'){
      title.textContent = 'Topical Exercise Resource Library';
    }
    const help = panel.querySelector(':scope > .header .help');
    const copy = 'Teacher-only resource-set management for imported topical questions. Students access eligible questions through ordinary Practice Mode.';
    if (help && help.textContent !== copy) help.textContent = copy;
    return true;
  }

  function decorateEligibility(card){
    const root = card?.querySelector?.('.v53a-practice-eligibility');
    if (!root) return false;
    const heading = root.querySelector('strong');
    if (heading && heading.textContent !== 'Practice resource bank eligibility'){
      heading.textContent = 'Practice resource bank eligibility';
    }
    replaceExactText(root,'Staged for unified Practice','In Practice resource bank');
    replaceExactText(root,'Ready to stage','Ready for Practice resource bank');
    replaceExactText(root,'Student retrieval not live yet','Live in student Practice');
    const help = root.querySelector('.help');
    if (help){
      const current = norm(help.textContent);
      if (current.includes('future unified practice pool') || current.includes('does not change student retrieval yet')){
        help.textContent = 'Eligible rows can be served through ordinary student Practice while topical rows remain inactive.';
      }
    }
    return true;
  }

  function decorateCard(card){
    if (!card) return false;
    const headerPills = card.querySelector('.qcard-head .pills');
    if (headerPills){
      [...headerPills.querySelectorAll('.tag')].forEach(tag => {
        if (norm(tag.textContent) === 'student exposure off' && tag.textContent !== 'Resource-bank source'){
          tag.textContent = 'Resource-bank source';
        }
      });
    }
    decorateEligibility(card);
    return true;
  }

  function decorate(){
    if (typeof document === 'undefined') return;
    injectStyles();
    decoratePanel();
    document.querySelectorAll('#v52b-cards .v52b-set-card').forEach(decorateCard);
  }

  function scheduleDecorate(delay=0){
    window.setTimeout(decorate,Math.max(0,Number(delay)||0));
  }

  function wire(){
    if (typeof document === 'undefined') return;
    decorate();
    const cards = document.getElementById('v52b-cards');
    if (cards && typeof MutationObserver !== 'undefined'){
      new MutationObserver(() => scheduleDecorate(0)).observe(cards,{childList:true});
    }
    document.addEventListener('click',event => {
      if (event.target?.closest?.('.tab[data-panel="questions-panel"],#v52b-refresh')){
        scheduleDecorate(0);
        scheduleDecorate(120);
      }
    });
    scheduleDecorate(80);
  }

  const api = Object.freeze({norm,decoratePanel,decorateEligibility,decorateCard});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V53E1TopicalResourceUiCleanup',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
