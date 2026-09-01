/* V5.4C — Compact Teacher Question Bank browsing.
   Presentation-only layer on top of the accepted V5.2B.1 50-card paging boundary,
   V5.4A resource visibility and V5.4B Practice eligibility controls.
   Compact view hides only secondary card detail while keeping question text,
   status badges and all card actions visible. No question data, Practice, grading,
   assignment or Exam behavior changes. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v54cCompactQuestionBankInstalled) return;
  ROOT.__v54cCompactQuestionBankInstalled = true;

  const STYLE_ID = 'v54c-compact-question-bank-style';
  const CONTROL_ID = 'v54c-question-bank-view';
  const PANEL_ID = 'questions-panel';
  let selectedView = 'compact';

  function normalizeView(value){
    return String(value || '').toLowerCase() === 'detailed' ? 'detailed' : 'compact';
  }

  function panel(){
    return typeof document !== 'undefined' ? document.getElementById(PANEL_ID) : null;
  }

  function currentView(){
    const target = panel();
    if (!target) return selectedView;
    return target.classList.contains('v54c-compact') ? 'compact' : 'detailed';
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID}.v54c-compact .qcard{
        padding:12px 14px;
      }
      #${PANEL_ID}.v54c-compact .qcard-head{
        align-items:center;
      }
      #${PANEL_ID}.v54c-compact .qcard-title{
        display:-webkit-box;
        -webkit-box-orient:vertical;
        -webkit-line-clamp:2;
        overflow:hidden;
        margin:7px 0 0;
      }
      #${PANEL_ID}.v54c-compact .qcard-detail{
        display:none !important;
      }
      #${PANEL_ID}.v54c-compact .qcard-meta{
        gap:5px;
      }
      #${PANEL_ID}.v54c-compact .qcard-actions{
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
      #${CONTROL_ID} .v54c-view-buttons{
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
      #${CONTROL_ID} .v54c-view-note{
        color:var(--muted);
        font-size:12px;
      }
      html[data-theme="dark"] #${CONTROL_ID}{
        background:var(--card);
        color:var(--text);
      }
      @media(max-width:760px){
        #${CONTROL_ID}{align-items:flex-start;}
        #${CONTROL_ID} .v54c-view-note{width:100%;}
      }
    `;
    document.head.appendChild(style);
  }

  function updateControls(view){
    if (typeof document === 'undefined') return;
    const root = document.getElementById(CONTROL_ID);
    if (!root) return;
    root.querySelectorAll('[data-v54c-view]').forEach(button => {
      const selected = button.dataset.v54cView === view;
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    const note = root.querySelector('.v54c-view-note');
    if (note){
      note.textContent = view === 'compact'
        ? 'Compact view hides secondary metadata while keeping question text, Practice status and actions visible.'
        : 'Detailed view shows the full metadata for every card on this page.';
    }
  }

  function setView(value){
    selectedView = normalizeView(value);
    const target = panel();
    if (target){
      target.classList.toggle('v54c-compact', selectedView === 'compact');
      target.dataset.v54cView = selectedView;
    }
    updateControls(selectedView);
    return selectedView;
  }

  function controlAnchor(){
    if (typeof document === 'undefined') return null;
    return document.getElementById('v54b-eligibility-feedback')
      || document.getElementById('v54a-resource-bank-summary')
      || document.getElementById('question-bank-count')
      || document.getElementById('v52b1-question-pagination');
  }

  function ensureControls(){
    if (typeof document === 'undefined') return null;
    injectStyles();
    let root = document.getElementById(CONTROL_ID);
    if (root){
      updateControls(selectedView);
      return root;
    }

    const anchor = controlAnchor();
    if (!anchor) return null;

    root = document.createElement('section');
    root.id = CONTROL_ID;
    root.setAttribute('aria-label','Question card view');
    root.innerHTML = `
      <div>
        <strong>Question card view</strong>
        <div class="v54c-view-note"></div>
      </div>
      <div class="v54c-view-buttons" role="group" aria-label="Question card view options">
        <button type="button" class="outline" data-v54c-view="compact" aria-pressed="true">Compact</button>
        <button type="button" class="outline" data-v54c-view="detailed" aria-pressed="false">Detailed</button>
      </div>`;
    anchor.insertAdjacentElement('afterend',root);

    root.addEventListener('click',event => {
      const button = event.target?.closest?.('[data-v54c-view]');
      if (!button) return;
      setView(button.dataset.v54cView);
    });

    updateControls(selectedView);
    return root;
  }

  function apply(){
    if (typeof document === 'undefined') return;
    injectStyles();
    ensureControls();
    setView(selectedView);
  }

  function scheduleApply(){
    if (typeof window === 'undefined') return;
    [0,80,220,600].forEach(delay => window.setTimeout(apply,delay));
  }

  function wire(){
    if (typeof document === 'undefined') return;
    scheduleApply();

    document.addEventListener('click',event => {
      if (event.target?.closest?.('.tab[data-panel="questions-panel"],#v52b-refresh,#v52b1-question-pagination button')){
        scheduleApply();
      }
    });

    document.addEventListener('change',event => {
      if (event.target?.closest?.('#v54a-eligibility-filter,#questions-panel .filtergrid')) scheduleApply();
    });
  }

  const api = Object.freeze({normalizeView,currentView,setView,ensureControls,controlAnchor});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V54CCompactQuestionBank',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
