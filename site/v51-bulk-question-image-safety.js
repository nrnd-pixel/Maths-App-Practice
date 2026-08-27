/* V5.1A2 — persistent image-reference and stale-selection safety guard.
   Keeps imported question image URLs durable and prevents a previous CSV file selection
   from being silently reused after the preview rows are replaced. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51BulkQuestionImageSafetyInstalled) return;
  if (typeof window !== 'undefined') window.__v51BulkQuestionImageSafetyInstalled = true;

  const trim = value => String(value ?? '').trim();

  function isPersistentHttpsRef(value){
    return /^https:\/\//i.test(trim(value));
  }

  function isNonPersistentRemoteRef(value){
    const ref = trim(value);
    if (!ref || isPersistentHttpsRef(ref)) return false;
    return /^\/\//.test(ref) || /^[a-z][a-z0-9+.-]*:/i.test(ref);
  }

  function readyRows(rows){
    return (rows || []).filter(row => row && row._valid !== false && !row._duplicate);
  }

  function unsafePersistentRows(rows){
    return readyRows(rows).filter(row => isNonPersistentRemoteRef(row.image_url));
  }

  function currentRows(){
    try {
      if (typeof importRows !== 'undefined' && Array.isArray(importRows)) return importRows;
    } catch {}
    return [];
  }

  function warningHost(){
    if (typeof document === 'undefined') return null;
    const panel = document.getElementById('v51a2-bulk-image-panel');
    if (!panel) return null;
    let warning = document.getElementById('v51a2-persistent-url-warning');
    if (!warning){
      warning = document.createElement('div');
      warning.id = 'v51a2-persistent-url-warning';
      warning.className = 'feedback incorrect hidden';
      warning.style.margin = '10px 0 0';
      const report = document.getElementById('v51a2-image-report');
      if (report) report.insertAdjacentElement('afterend',warning);
      else panel.appendChild(warning);
    }
    return warning;
  }

  function refreshPersistentGuard(){
    if (typeof document === 'undefined') return [];
    const unsafe = unsafePersistentRows(currentRows());
    const button = document.getElementById('import-btn');
    const warning = warningHost();

    if (unsafe.length){
      if (button){
        button.disabled = true;
        button.dataset.v51a2PersistentBlocked = '1';
        button.title = 'Replace temporary/non-HTTPS image URLs before importing questions.';
      }
      if (warning){
        const sample = [...new Set(unsafe.map(row => trim(row.image_url)).filter(Boolean))].slice(0,3);
        warning.classList.remove('hidden');
        warning.innerHTML = `<strong>⚠ Persistent image URL required.</strong> ${unsafe.length} ready row${unsafe.length===1?'':'s'} use${unsafe.length===1?'s':''} a temporary or non-HTTPS image reference. Use a relative filename for bulk upload, a blank image field, or a permanent <code>https://</code> URL.${sample.length ? `<div class="muted" style="margin-top:5px">Example: ${sample.map(value=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')).join(', ')}</div>` : ''}`;
      }
    } else {
      if (button?.dataset.v51a2PersistentBlocked === '1'){
        delete button.dataset.v51a2PersistentBlocked;
        if (button.title === 'Replace temporary/non-HTTPS image URLs before importing questions.') button.removeAttribute('title');
      }
      if (warning){
        warning.classList.add('hidden');
        warning.textContent = '';
      }
    }
    return unsafe;
  }

  function clearStaleImageSelection(){
    if (typeof document === 'undefined') return false;
    const clearButton = document.getElementById('v51a2-clear-images');
    const input = document.getElementById('v51a2-image-files');
    if (!clearButton || !input?.files?.length) return false;
    clearButton.click();
    return true;
  }

  function deferRefresh(){
    if (typeof window === 'undefined') return;
    const raf = typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : callback => window.setTimeout(callback,0);
    raf(() => raf(refreshPersistentGuard));
  }

  function wire(){
    if (typeof document === 'undefined') return;
    let lastRows = currentRows();

    const summary = document.getElementById('import-summary');
    if (summary && typeof MutationObserver !== 'undefined'){
      const observer = new MutationObserver(() => {
        const rows = currentRows();
        if (rows !== lastRows){
          lastRows = rows;
          clearStaleImageSelection();
        }
        deferRefresh();
      });
      observer.observe(summary,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    }

    const importButton = document.getElementById('import-btn');
    if (importButton && typeof MutationObserver !== 'undefined'){
      const buttonObserver = new MutationObserver(() => {
        if (unsafePersistentRows(currentRows()).length && !importButton.disabled){
          importButton.disabled = true;
          importButton.dataset.v51a2PersistentBlocked = '1';
        }
      });
      buttonObserver.observe(importButton,{attributes:true,attributeFilter:['disabled']});
    }

    document.addEventListener('change',event => {
      if (!event.target?.matches?.('#v51a2-image-files')) return;
      deferRefresh();
    },true);

    document.addEventListener('click',event => {
      if (!event.target?.closest?.('#v51a2-upload-images')) return;
      deferRefresh();
    },true);

    document.addEventListener('click',event => {
      if (!event.target?.closest?.('#import-btn')) return;
      const unsafe = unsafePersistentRows(currentRows());
      if (!unsafe.length) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      refreshPersistentGuard();
      try { alert('Question import is blocked because one or more image URLs are temporary or non-HTTPS. Use a relative filename for bulk upload or a permanent HTTPS URL.'); } catch {}
    },true);

    deferRefresh();
  }

  const api = Object.freeze({
    isPersistentHttpsRef,
    isNonPersistentRemoteRef,
    unsafePersistentRows,
    refreshPersistentGuard,
    clearStaleImageSelection
  });

  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V51BulkQuestionImageSafety',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
