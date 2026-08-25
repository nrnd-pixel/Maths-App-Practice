/* V5.0C1 print polish — improves the saved Class Report PDF only.
   No reporting data, filters, scoring, mastery or database behavior changes. */
(() => {
  'use strict';

  const STYLE_ID = 'v50c1-print-polish-style';
  const OVERLAY_ID = 'v50c1-class-report-overlay';
  let titleRestoreTimer = 0;

  function injectPrintStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @media print{
        body.v50c1-printing #${OVERLAY_ID} section.v50c1-section{break-inside:auto!important;page-break-inside:auto!important}
        body.v50c1-printing #${OVERLAY_ID} section.v50c1-section:nth-of-type(1),
        body.v50c1-printing #${OVERLAY_ID} section.v50c1-section:nth-of-type(2){break-inside:avoid!important;page-break-inside:avoid!important}
        body.v50c1-printing #${OVERLAY_ID} section.v50c1-section:nth-of-type(3){break-inside:auto!important;page-break-inside:auto!important}
        body.v50c1-printing #${OVERLAY_ID} section.v50c1-section:nth-of-type(3) h3,
        body.v50c1-printing #${OVERLAY_ID} section.v50c1-section:nth-of-type(3) .v50c1-section-note{break-after:avoid!important;page-break-after:avoid!important}
        body.v50c1-printing #${OVERLAY_ID} thead{display:table-header-group!important}
        body.v50c1-printing #${OVERLAY_ID} tbody{display:table-row-group!important}
        body.v50c1-printing #${OVERLAY_ID} tr{break-inside:avoid!important;page-break-inside:avoid!important}
        body.v50c1-printing #${OVERLAY_ID} th,
        body.v50c1-printing #${OVERLAY_ID} td{font-size:8.5px!important;padding:4px 5px!important;line-height:1.25!important}
        body.v50c1-printing #${OVERLAY_ID} .v50c1-section{margin-top:12px!important}
        body.v50c1-printing #${OVERLAY_ID} .v50c1-footer{margin-top:10px!important;padding-top:8px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function normalise(value){
    return String(value || '').replace(/\s+/g,' ').trim().toLowerCase();
  }

  function dedupeScopeLine(){
    const toolbar = document.querySelector(`#${OVERLAY_ID} .v50c1-toolbar`);
    const scope = toolbar?.querySelector('p');
    if (!scope) return;
    const parts = scope.textContent.split('·').map(part=>part.trim()).filter(Boolean);
    const kept = [];
    for (const part of parts){
      const key = normalise(part);
      const duplicate = kept.some(previous=>{
        const prior = normalise(previous);
        return prior===key || prior.includes(key) || key.includes(prior);
      });
      if (!duplicate) kept.push(part);
    }
    scope.textContent = kept.join(' · ');
  }

  function reportPrintTitle(){
    const heading = document.getElementById('v50c1-report-title');
    const plain = String(heading?.textContent || 'Class performance report')
      .replace(/^\s*📄\s*/u,'')
      .replace(/[\\/:*?"<>|]+/g,'-')
      .replace(/\s+/g,' ')
      .trim();
    return plain || 'Class performance report';
  }

  function preparePrintTitle(){
    const previous = document.title;
    document.title = reportPrintTitle();
    clearTimeout(titleRestoreTimer);
    let restored = false;
    const restore = ()=>{
      if (restored) return;
      restored = true;
      document.title = previous;
    };
    window.addEventListener('afterprint',restore,{once:true});
    titleRestoreTimer = window.setTimeout(restore,2000);
  }

  function watchReport(){
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    const sheet = overlay.querySelector('.v50c1-sheet');
    if (!sheet) return;
    const observer = new MutationObserver(()=>queueMicrotask(dedupeScopeLine));
    observer.observe(sheet,{childList:true,subtree:true});
    dedupeScopeLine();
  }

  function wire(){
    injectPrintStyles();
    watchReport();
    document.addEventListener('click',event=>{
      const button = event.target.closest?.('#v50c1-print');
      if (!button) return;
      dedupeScopeLine();
      preparePrintTitle();
    },true);
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
