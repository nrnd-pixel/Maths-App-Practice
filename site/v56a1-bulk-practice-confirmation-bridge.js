/* V5.6A.1 — Reliable in-app confirmation bridge for bulk Practice eligibility.
   Some embedded browsers do not surface native window.confirm reliably. This layer
   shows an explicit in-app modal, then routes the confirmed action through the existing
   V5.4E button/RPC path. It performs no database write itself. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v56a1BulkPracticeConfirmationBridgeInstalled) return;
  ROOT.__v56a1BulkPracticeConfirmationBridgeInstalled = true;

  const MODAL_ID = 'v56a1-bulk-practice-confirm-modal';
  let open = false;

  function api(){
    try { return ROOT.V54EBulkPracticeEligibility || null; } catch { return null; }
  }

  function actionTarget(button){
    return button?.id === 'v54e-add-practice';
  }

  function planFor(button){
    const target = actionTarget(button);
    try {
      return api()?.buildPlan?.(undefined,undefined,target) || null;
    } catch { return null; }
  }

  function modalText(plan){
    try { return api()?.confirmationText?.(plan) || ''; } catch { return ''; }
  }

  function removeExisting(){
    if (typeof document === 'undefined') return;
    document.getElementById(MODAL_ID)?.remove?.();
  }

  function showModal(button,plan){
    if (typeof document === 'undefined' || open) return Promise.resolve(false);
    open = true;
    removeExisting();

    const target = actionTarget(button);
    const action = target ? 'Add to Practice' : 'Remove from Practice';
    const text = modalText(plan) || `${action} the selected questions?`;

    return new Promise(resolve=>{
      const root = document.createElement('div');
      root.id = MODAL_ID;
      root.className = 'modal';
      root.setAttribute('role','dialog');
      root.setAttribute('aria-modal','true');
      root.setAttribute('aria-labelledby','v56a1-confirm-title');
      root.innerHTML = `
        <div class="modal-card" style="width:min(560px,100%)">
          <div class="editor-head">
            <div>
              <h3 id="v56a1-confirm-title" style="margin-bottom:6px">${target?'Add selected questions to Practice?':'Remove selected questions from Practice?'}</h3>
              <div class="muted">This confirmation stays inside the app so it works reliably in embedded browsers.</div>
            </div>
          </div>
          <div id="v56a1-confirm-text" class="info" style="white-space:pre-line;margin-top:10px"></div>
          <div class="info" style="margin-top:10px">
            <strong>${target?'Adding':'Removing'} affects Practice availability only.</strong><br>
            The existing V5.4E action keeps <code>active</code> unchanged, so Exam availability is not changed by this action.
          </div>
          <div class="buttons" style="justify-content:flex-end">
            <button id="v56a1-confirm-cancel" type="button" class="outline">Cancel</button>
            <button id="v56a1-confirm-apply" type="button" class="${target?'primary':'warning'}">${action}</button>
          </div>
        </div>`;
      root.querySelector('#v56a1-confirm-text').textContent = text;

      const finish = value => {
        root.remove();
        open = false;
        resolve(!!value);
      };
      root.querySelector('#v56a1-confirm-cancel')?.addEventListener('click',()=>finish(false),{once:true});
      root.querySelector('#v56a1-confirm-apply')?.addEventListener('click',()=>finish(true),{once:true});
      root.addEventListener('click',event=>{ if (event.target === root) finish(false); });
      document.body.appendChild(root);
      root.querySelector('#v56a1-confirm-apply')?.focus?.();
    });
  }

  function runEstablishedAction(button){
    if (!button || button.disabled) return false;
    const originalConfirm = ROOT.confirm;
    button.dataset.v56a1Confirmed = '1';
    try {
      ROOT.confirm = () => true;
      button.click();
      return true;
    } finally {
      ROOT.confirm = originalConfirm;
      delete button.dataset.v56a1Confirmed;
    }
  }

  async function intercept(button,event){
    if (!button || button.disabled || open) return;
    const plan = planFor(button);
    if (!plan?.canRun) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const confirmed = await showModal(button,plan);
    if (!confirmed) return;
    runEstablishedAction(button);
  }

  function wire(){
    if (typeof document === 'undefined') return;
    document.addEventListener('click',event=>{
      const button = event.target?.closest?.('#v54e-add-practice,#v54e-remove-practice');
      if (!button || button.dataset.v56a1Confirmed === '1') return;
      void intercept(button,event);
    },true);
  }

  const bridge = Object.freeze({actionTarget,planFor,modalText,showModal,runEstablishedAction});
  if (typeof module !== 'undefined' && module.exports) module.exports = bridge;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V56A1BulkPracticeConfirmationBridge',{value:bridge,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
