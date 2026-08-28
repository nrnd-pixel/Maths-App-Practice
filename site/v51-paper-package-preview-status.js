/* V5.1A4 — package-preview status wording polish.
   Distinguishes a fully validated package with no new rows from one ready for staged import.
   Presentation-only: no import, Storage, grading or database behavior changes. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51PaperPackagePreviewStatusInstalled) return;
  if (typeof window !== 'undefined') window.__v51PaperPackagePreviewStatusInstalled = true;

  function statusLabel({ready,readyRows=0,invalidRows=0}={}){
    if (!ready) return '⚠ Package needs attention';
    if (Number(readyRows) === 0 && Number(invalidRows) === 0) return '✅ Package validated — already fully imported';
    return '✅ Package ready for staged import';
  }

  function reportCounts(text){
    const value = String(text || '');
    const ready = value.match(/CSV:\s*\d+\s+rows\s*·\s*(\d+)\s+ready/i);
    const invalid = value.match(/·\s*(\d+)\s+need attention/i);
    return {
      readyRows:ready ? Number(ready[1]) : null,
      invalidRows:invalid ? Number(invalid[1]) : null
    };
  }

  function refresh(){
    if (typeof document === 'undefined') return;
    const report = document.getElementById('v51a4-package-report');
    if (!report) return;
    const feedback = report.querySelector('.feedback');
    const headline = feedback?.querySelector('div > strong');
    if (!feedback || !headline) return;

    const text = report.textContent || '';
    const ready = /Package ready for staged import|Package validated — already fully imported/i.test(headline.textContent || '');
    if (!ready && /Package needs attention/i.test(headline.textContent || '')) return;

    const counts = reportCounts(text);
    if (counts.readyRows == null || counts.invalidRows == null) return;
    headline.textContent = statusLabel({ready:true,...counts});
  }

  function wire(){
    if (typeof document === 'undefined') return;
    const attach = () => {
      const report = document.getElementById('v51a4-package-report');
      if (!report) return false;
      refresh();
      if (typeof MutationObserver !== 'undefined'){
        const observer = new MutationObserver(() => refresh());
        observer.observe(report,{childList:true,subtree:true,characterData:true});
      }
      return true;
    };
    if (!attach()){
      const timer = window.setInterval(() => { if (attach()) window.clearInterval(timer); },100);
      window.setTimeout(() => window.clearInterval(timer),5000);
    }
  }

  const api = Object.freeze({statusLabel,reportCounts,refresh});
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V51PaperPackagePreviewStatus',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
