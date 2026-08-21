/* V3.8 UI polish — improves teacher AI Help settings readability in both themes. */
(() => {
  'use strict';

  const byId = id => document.getElementById(id);

  function injectStyle(){
    if(byId('ai-help-polish-style-v38')) return;

    const style = document.createElement('style');
    style.id = 'ai-help-polish-style-v38';
    style.textContent = `
      .ai-admin-toggle-v38{
        background:var(--card) !important;
        color:var(--text) !important;
        min-height:72px;
        align-items:flex-start;
      }
      .ai-admin-toggle-v38 > span{
        display:grid;
        gap:4px;
        line-height:1.35;
      }
      .ai-admin-toggle-v38 .help{
        display:block;
        color:var(--muted) !important;
        font-weight:500;
        line-height:1.45;
      }
      .ai-admin-toggle-v38 input{
        margin-top:3px;
        flex:0 0 auto;
      }
      .ai-admin-locked-v38{
        background:var(--soft) !important;
        color:var(--text) !important;
        opacity:.72 !important;
      }
      .ai-admin-note-v38{
        background:var(--soft) !important;
        color:var(--muted) !important;
      }
      .ai-admin-note-v38 strong{
        color:var(--text);
      }
      .ai-admin-status-v38 .tag{
        background:var(--soft);
        color:var(--text);
        border:1px solid var(--border);
      }
      .ai-admin-actions-v38{
        align-items:center;
      }
      .ai-admin-save-state-v38{
        min-height:24px;
        display:inline-flex;
        align-items:center;
        color:var(--muted);
        font-size:13px;
        font-weight:700;
      }
      .ai-admin-save-state-v38.success{color:var(--success)}
      .ai-admin-save-state-v38.error{color:var(--danger)}

      html[data-theme="dark"] .ai-admin-toggle-v38,
      html[data-theme="dark"] .ai-admin-note-v38,
      html[data-theme="dark"] .ai-admin-status-v38 .tag{
        box-shadow:none;
      }

      @media(max-width:760px){
        .ai-admin-toggle-v38{min-height:0}
        .ai-admin-actions-v38{
          display:grid;
          grid-template-columns:1fr;
        }
        .ai-admin-actions-v38 button{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function wireSaveState(){
    const actions = document.querySelector('.ai-admin-actions-v38');
    const feedback = byId('ai-help-admin-feedback-v38');
    if(!actions || !feedback || byId('ai-help-save-state-v38')) return false;

    const state = document.createElement('span');
    state.id = 'ai-help-save-state-v38';
    state.className = 'ai-admin-save-state-v38';
    state.setAttribute('aria-live','polite');
    actions.appendChild(state);

    const sync = () => {
      const message = String(feedback.textContent || '').trim();
      state.className = 'ai-admin-save-state-v38';

      if(!message || feedback.classList.contains('hidden')){
        state.textContent = '';
        return;
      }

      if(feedback.classList.contains('correct')){
        state.classList.add('success');
        state.textContent = '✓ Settings saved';
      }
      else if(feedback.classList.contains('incorrect')){
        state.classList.add('error');
        state.textContent = 'Settings not saved';
      }
      else{
        state.textContent = message;
      }
    };

    new MutationObserver(sync).observe(feedback, {
      attributes:true,
      childList:true,
      characterData:true,
      subtree:true
    });
    sync();
    return true;
  }

  function init(){
    injectStyle();

    if(wireSaveState()) return;

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if(wireSaveState() || attempts > 40) clearInterval(timer);
    }, 100);
  }

  if(document.readyState === 'complete') init();
  else window.addEventListener('load', init, {once:true});
})();
