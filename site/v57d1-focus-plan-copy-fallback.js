/* V5.7D.1 — Focus Plan Copy Fallback.
   Hardens the V5.7D Teaching Focus Plan action for browsers/previews where
   clipboard APIs are unavailable or denied. The analytics action always opens
   a selectable in-app plan first; copying is then attempted from an explicit
   user gesture inside that view. Uses the same read-only teacher analytics RPC. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v57d1FocusPlanCopyFallbackInstalled) return;
  ROOT.__v57d1FocusPlanCopyFallbackInstalled = true;

  const RPC_NAME = 'get_teacher_past_paper_analytics_v56d';
  const OVERLAY_ID = 'v57d1-focus-plan-overlay';
  const STYLE_ID = 'v57d1-focus-plan-style';
  const TEXTAREA_ID = 'v57d1-focus-plan-text';

  const trim = value => String(value ?? '').trim();

  function selectionFromUi(){
    if (typeof document === 'undefined') return null;
    const classId = trim(document.getElementById('v56d-class')?.value);
    const option = document.getElementById('v56d-paper')?.selectedOptions?.[0];
    const examYear = Number(option?.dataset?.year || 0);
    const paper = trim(option?.dataset?.paper);
    return classId && examYear && paper ? {classId,examYear,paper} : null;
  }

  function setFeedback(message,kind='ok'){
    const node = document.getElementById('v57d-analytics-actions-feedback');
    if (!node) return;
    node.textContent = String(message || '');
    node.className = message ? kind : 'hidden';
  }

  function legacyCopy(text){
    if (typeof document === 'undefined' || !text) return false;
    const area = document.createElement('textarea');
    area.value = String(text);
    area.setAttribute('readonly','');
    area.setAttribute('aria-hidden','true');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    area.style.top = '0';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.focus({preventScroll:true});
    area.select();
    area.setSelectionRange(0,area.value.length);
    let ok = false;
    try { ok = document.execCommand('copy') === true; } catch {}
    area.remove();
    return ok;
  }

  async function clipboardCopy(text){
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(String(text));
        return true;
      }
    } catch {}
    return false;
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${OVERLAY_ID}{position:fixed;inset:0;z-index:10140;background:rgba(15,23,42,.68);display:grid;place-items:center;padding:16px}
      #${OVERLAY_ID}.hidden{display:none!important}
      #${OVERLAY_ID} .v57d1-card{width:min(760px,100%);max-height:92vh;overflow:auto;background:var(--card,#fff);color:var(--text,#172033);border:1px solid var(--border,#d8e0ec);border-radius:20px;padding:18px;box-shadow:0 28px 90px rgba(0,0,0,.28)}
      #${OVERLAY_ID} .v57d1-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap}
      #${OVERLAY_ID} .v57d1-head h3{margin:0 0 4px}
      #${OVERLAY_ID} textarea{width:100%;min-height:360px;margin-top:12px;font:13px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap}
      #${OVERLAY_ID} .v57d1-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      #${OVERLAY_ID} .v57d1-note{font-size:11px;color:var(--muted,#667085);line-height:1.45;margin-top:8px}
      @media(max-width:600px){#${OVERLAY_ID}{padding:7px}#${OVERLAY_ID} .v57d1-card{padding:14px;border-radius:15px}#${OVERLAY_ID} textarea{min-height:300px}#${OVERLAY_ID} .v57d1-actions button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function ensureOverlay(){
    injectStyles();
    let root = document.getElementById(OVERLAY_ID);
    if (root) return root;
    root = document.createElement('div');
    root.id = OVERLAY_ID;
    root.className = 'hidden';
    root.innerHTML = `<div class="v57d1-card" role="dialog" aria-modal="true" aria-labelledby="v57d1-title">
      <div class="v57d1-head"><div><h3 id="v57d1-title">📋 Teaching Focus Plan</h3><div class="help">Review the plan, then copy it into your lesson notes, WhatsApp draft or planning document.</div></div><button type="button" class="outline" data-v57d1-close>Close</button></div>
      <textarea id="${TEXTAREA_ID}" readonly aria-label="Teaching focus plan"></textarea>
      <div class="v57d1-actions"><button type="button" class="primary" data-v57d1-copy>Copy Plan</button><button type="button" class="outline" data-v57d1-select>Select All</button></div>
      <div class="v57d1-note">If your browser blocks clipboard access, use Select All and press Ctrl+C, or use Copy on your phone/tablet. The full plan stays visible here.</div>
      <div class="feedback hidden" data-v57d1-feedback role="status" aria-live="polite"></div>
    </div>`;
    document.body.appendChild(root);
    root.addEventListener('click',event=>{
      if (event.target === root || event.target.closest?.('[data-v57d1-close]')) closeOverlay();
      if (event.target.closest?.('[data-v57d1-select]')) selectPlan();
      if (event.target.closest?.('[data-v57d1-copy]')) void copyFromOverlay();
    });
    return root;
  }

  function showOverlay(text,message='Teaching focus plan is ready. Review it, then use Copy Plan or Select All.'){
    const root = ensureOverlay();
    const area = root.querySelector(`#${TEXTAREA_ID}`);
    const feedback = root.querySelector('[data-v57d1-feedback]');
    if (area) area.value = String(text || '');
    if (feedback){ feedback.textContent = message; feedback.className = 'feedback correct'; }
    root.classList.remove('hidden');
    window.setTimeout(()=>{
      const close = root.querySelector('[data-v57d1-close]');
      close?.focus?.({preventScroll:true});
    },0);
  }

  function closeOverlay(){
    document.getElementById(OVERLAY_ID)?.classList.add('hidden');
  }

  function selectPlan(){
    const area = document.getElementById(TEXTAREA_ID);
    if (!area) return false;
    area.focus({preventScroll:true});
    area.select();
    area.setSelectionRange(0,area.value.length);
    return true;
  }

  async function copyFromOverlay(){
    const area = document.getElementById(TEXTAREA_ID);
    const feedback = document.querySelector(`#${OVERLAY_ID} [data-v57d1-feedback]`);
    const text = area?.value || '';
    if (!text) return false;

    // This button click is a fresh user gesture. Try the synchronous legacy
    // path first, then the modern API. If both are blocked, leave the plan
    // selected so manual copy remains deterministic.
    const syncOk = legacyCopy(text);
    const ok = syncOk || await clipboardCopy(text);
    if (feedback){
      feedback.textContent = ok ? 'Teaching focus plan copied.' : 'Clipboard access is blocked here. The full plan is selected — press Ctrl+C or use Copy on your device.';
      feedback.className = `feedback ${ok?'correct':'try'}`;
    }
    if (!ok) selectPlan();
    return ok;
  }

  async function loadPlan(){
    const selected = selectionFromUi();
    const api = ROOT.V57DPastPaperAnalyticsActions;
    if (!selected || !api?.focusPlanText || typeof cloud === 'undefined' || !cloud?.rpc){
      setFeedback('Teaching focus plan is not ready yet. Refresh Past Paper Analytics and try again.','warn');
      return '';
    }
    const {data,error} = await cloud.rpc(RPC_NAME,{
      p_class_id:selected.classId,
      p_exam_year:selected.examYear,
      p_paper:selected.paper
    });
    if (error) throw error;
    return api.focusPlanText(data || {});
  }

  function enableFocusButtons(root=document){
    if (typeof document === 'undefined' || !root?.querySelectorAll) return 0;
    let changed = 0;
    root.querySelectorAll('[data-v57d-copy]').forEach(button=>{
      if (button.disabled || button.hasAttribute('disabled')) changed += 1;
      button.disabled = false;
      button.removeAttribute('disabled');
      button.setAttribute('aria-disabled','false');
      button.title = 'Open the teaching focus plan';
    });
    return changed;
  }

  async function handleCopyClick(event){
    const button = event.target?.closest?.('[data-v57d-copy]');
    if (!button) return;

    // Capture at window level so the original V5.7D delegated handler is not
    // invoked. V5.7D.1 always opens an in-app plan; clipboard permission is
    // only requested later from the explicit Copy Plan button.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Preparing…';
    try {
      const text = await loadPlan();
      if (!text){
        setFeedback('There is not enough Past Paper evidence to prepare a focus plan yet.','warn');
        return;
      }
      showOverlay(text);
      setFeedback('Teaching focus plan opened. Use Copy Plan or Select All.','ok');
    } catch(error){
      console.warn('V5.7D.1 focus plan preparation failed.',error);
      setFeedback('Could not prepare the focus plan. Refresh Past Paper Analytics and try again.','warn');
    } finally {
      button.disabled = false;
      button.removeAttribute('disabled');
      button.textContent = original;
    }
  }

  function install(){
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    injectStyles();
    enableFocusButtons(document);

    // Window capture runs before V5.7D's document-capture delegated click handler.
    window.addEventListener('click',handleCopyClick,true);
    document.addEventListener('keydown',event=>{ if (event.key === 'Escape') closeOverlay(); });

    // V5.7D rebuilds the action panel whenever the class/paper changes. Re-enable
    // the focus-plan action after each render, including papers with no attempted
    // question/topic evidence yet; the class summary/cohort plan is still useful.
    if (typeof MutationObserver !== 'undefined'){
      new MutationObserver(mutations=>{
        for (const mutation of mutations){
          for (const node of mutation.addedNodes || []){
            if (node?.nodeType === 1){
              if (node.matches?.('[data-v57d-copy]')) enableFocusButtons(node.parentElement || document);
              else if (node.querySelector?.('[data-v57d-copy]')) enableFocusButtons(node);
            }
          }
        }
        enableFocusButtons(document);
      }).observe(document.body,{childList:true,subtree:true});
    }

    [0,120,350,800].forEach(delay=>window.setTimeout(()=>enableFocusButtons(document),delay));
    return true;
  }

  const api = Object.freeze({RPC_NAME,selectionFromUi,legacyCopy,clipboardCopy,enableFocusButtons});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V57D1FocusPlanCopyFallback',{value:api,writable:false,configurable:false});
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
    else install();
  }
})();
