/* V5.4A1 — Compact Teacher Question Bank browsing.
   Presentation-only layer on top of the accepted V5.2B.1 50-card paging boundary.
   Compact view is the default and keeps essential badges, question text and actions visible;
   teachers can switch the current page to full metadata at any time.
   No question data, bulk-selection semantics, student Practice, grading or Exam behavior changes. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v54a1CompactQuestionBankInstalled) return;
  ROOT.__v54a1CompactQuestionBankInstalled = true;

  const STYLE_ID = 'v54a1-compact-question-bank-style';
  const CONTROL_ID = 'v54a1-question-bank-view';
  const PANEL_ID = 'questions-panel';

  function normalizeView(value){
    return String(value || '').toLowerCase() === 'detailed' ? 'detailed' : 'compact';
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID}.v54a1-compact .qcard{
        padding:12px 14px;
      }
      #${PANEL_ID}.v54a1-compact .qcard-head{
        align-items:center;
      }
      #${PANEL_ID}.v54a1-compact .qcard-title{
        display:-webkit-box;
        -webkit-box-orient:vertical;
        -webkit-line-clamp:2;
        overflow:hidden;
        margin:7px 0 0;
      }
      #${PANEL_ID}.v54a1-compact .qcard-detail{
        display:none !important;
      }
      #${PANEL_ID}.v54a1-compact .qcard-meta{
        gap:5px;
      }
      #${PANEL_ID}.v54a1-compact .qcard-actions{
        align-items:center;
      }
      #${CONTROL_ID}{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        flex-wrap:wrap;
        margin:0 0 12px;
        padding:10px 12px;
        border:1px solid var(--border);
        border-radius:13px;
        background:var(--card);
      }
      #${CONTROL_ID} .v54a1-view-buttons{
        display:flex;
        gap:6px;
        flex-wrap:wrap;
      }
      #${CONTROL_ID} button{
        min-height:36px;
        padding:7px 11px;
        font-size:13px;
      }
      #${CONTROL_ID} button[aria-pressed="true"]{
        background:var(--primary);
        color:#fff;
      }
      #${CONTROL_ID} .v54a1-view-note{
        color:var(--muted);
        font-size:12px;
      }
      html[data-theme="dark"] #${CONTROL_ID}{
        background:var(--card);
        color:var(--text);
      }
      @media(max-width:760px){
        #${CONTROL_ID}{align-items:flex-start;}
        #${CONTROL_ID} .v54a1-view-note{width:100%;}
      }
    `;
    document.head.appendChild(style);
  }

  function panel(){
    return typeof document !== 'undefined' ? document.getElementById(PANEL_ID) : null;
  }

  function currentView(){
    return panel()?.classList?.contains('v54a1-compact') ? 'compact' : 'detailed';
  }

  function updateControls(view){
    const root = typeof document !== 'undefined' ? document.getElementById(CONTROL_ID) : null;
    if (!root) return;
    root.querySelectorAll('[data-v54a1-view]').forEach(button => {
      const selected = button.dataset.v54a1View === view;
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    const note = root.querySelector('.v54a1-view-note');
    if (note){
      note.textContent = view === 'compact'
        ? 'Compact view hides secondary metadata while keeping question text, status and actions visible.'
        : 'Detailed view shows the full metadata for every card on this page.';
    }
  }

  function setView(value){
    const view = normalizeView(value);
    const target = panel();
    if (!target) return view;
    target.classList.toggle('v54a1-compact', view === 'compact');
    target.dataset.v54a1View = view;
    updateControls(view);
    return view;
  }

  function ensureControls(){
    if (typeof document === 'undefined') return null;
    let root = document.getElementById(CONTROL_ID);
    if (root) return root;

    const pager = document.getElementById('v52b1-question-pagination');
    const count = document.getElementById('question-bank-count');
    const anchor = pager || count;
    if (!anchor) return null;

    root = document.createElement('section');
    root.id = CONTROL_ID;
    root.setAttribute('aria-label','Question card view');
    root.innerHTML = `
      <div>
        <strong>Question card view</strong>
        <div class="v54a1-view-note"></div>
      </div>
      <div class="v54a1-view-buttons" role="group" aria-label="Question card view options">
        <button type="button" class="outline" data-v54a1-view="compact" aria-pressed="true">Compact</button>
        <button type="button" class="outline" data-v54a1-view="detailed" aria-pressed="false">Detailed</button>
      </div>`;
    anchor.insertAdjacentElement('afterend',root);

    root.addEventListener('click',event => {
      const button = event.target?.closest?.('[data-v54a1-view]');
      if (!button) return;
      setView(button.dataset.v54a1View);
    });

    updateControls(currentView());
    return root;
  }

  function install(){
    if (typeof document === 'undefined') return;
    injectStyles();
    ensureControls();
    setView('compact');
  }

  const api = Object.freeze({normalizeView,currentView,setView,ensureControls});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V54A1CompactQuestionBank',{value:api,writable:false,configurable:false});
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
    else install();
  }
})();
