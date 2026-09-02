/* V5.5A.1 — Practice type guard and preview polish.
   Keeps the V5.5A Past Paper Practice route inside the existing Practice engine.
   Topic Practice now requires an explicit strand/topic selection, its filters open
   automatically, and Past Paper Practice is hardened to past_paper source rows only. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v55a1PracticeTypeGuardInstalled) return;
  ROOT.__v55a1PracticeTypeGuardInstalled = true;

  const norm = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g,' ');
  let wrappersInstalled = false;

  function currentType(){
    try { return ROOT.V55APastPaperPractice?.getPracticeType?.() || 'mixed'; }
    catch { return 'mixed'; }
  }

  function openTopicSettings(){
    const summary = document.querySelector('#start .v40c-practice-summary');
    if (!summary) return;
    summary.classList.add('v40c-settings-open');
    const change = summary.querySelector('.v40c-change-settings');
    if (change){
      change.setAttribute('aria-expanded','true');
      change.textContent = 'Hide settings';
    }
  }

  function topicSelectionReady(){
    const strand = document.getElementById('strand-filter')?.value || 'all';
    const topic = document.getElementById('topic-filter')?.value || 'all';
    return strand !== 'all' || topic !== 'all';
  }

  function itemRows(item){
    return item?._kind === 'multipart' && Array.isArray(item.parts) && item.parts.length
      ? item.parts
      : [item];
  }

  function isPastPaperItem(item){
    const rows = itemRows(item).filter(Boolean);
    return rows.length > 0 && rows.every(row => norm(row.source_type) === 'past_paper');
  }

  function polishPaperNote(){
    const note = document.getElementById('v55a-paper-note');
    if (!note) return;
    const next = String(note.textContent || '').replace('marks in the source paper','marks available in the Practice bank');
    if (next !== note.textContent) note.textContent = next;
  }

  function wireUi(){
    document.addEventListener('click', event => {
      const topic = event.target?.closest?.('.v55a-practice-type[data-type="topic"]');
      if (topic) window.setTimeout(openTopicSettings,0);
    }, true);

    const note = document.getElementById('v55a-paper-note');
    if (note && note.dataset.v55a1Observed !== '1'){
      note.dataset.v55a1Observed = '1';
      new MutationObserver(polishPaperNote).observe(note,{childList:true,characterData:true,subtree:true});
      polishPaperNote();
    }
  }

  function installWrappers(){
    if (wrappersInstalled) return true;
    if (!ROOT.__v55aPastPaperPracticeWrappersInstalled) return false;
    if (typeof startPractice !== 'function' || typeof getQuestions !== 'function') return false;

    const previousGetQuestions = getQuestions;
    const previousStartPractice = startPractice;

    getQuestions = async function(...args){
      const items = await previousGetQuestions.apply(this,args);
      if (currentType() !== 'past_paper') return items;
      return (Array.isArray(items) ? items : []).filter(isPastPaperItem);
    };
    try { ROOT.getQuestions = getQuestions; } catch {}

    startPractice = async function(...args){
      if (currentType() === 'topic' && !topicSelectionReady()){
        openTopicSettings();
        window.alert('Choose a strand or topic before starting Topic Practice.');
        window.setTimeout(() => document.getElementById('strand-filter')?.focus(),0);
        return;
      }
      return previousStartPractice.apply(this,args);
    };
    try { ROOT.startPractice = startPractice; } catch {}

    wrappersInstalled = true;
    return true;
  }

  function install(){
    if (typeof document === 'undefined') return false;
    wireUi();
    return installWrappers();
  }

  function schedule(){
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    let tries = 0;
    const run = () => {
      tries += 1;
      if (installWrappers()){
        wireUi();
        return;
      }
      if (tries < 100) window.setTimeout(run,100);
    };
    run();
  }

  const api = Object.freeze({topicSelectionReady,isPastPaperItem,openTopicSettings,polishPaperNote});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V55A1PracticeTypeGuard',{value:api,writable:false,configurable:false});
    schedule();
  }
})();
