/* V5.7D.1 — Focus Plan Copy Fallback.
   Hardens the V5.7D Teaching Focus Plan copy action for browsers/previews where
   the async Clipboard API is unavailable or denied. Uses the same read-only
   teacher analytics RPC and exposes a selectable in-app fallback when needed. */
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
      <div class="v57d1-head"><div><h3 id="v57d1-title">📋 Teaching Focus Plan</h3><div class="help">Copy the plan below into your lesson notes, WhatsApp draft or planning document.</div></div><button type="button" class="outline" data-v57d1-close>Close</button></div>
      <textarea id="${TEXTAREA_ID}" readonly aria-label="Teaching focus plan"></textarea>
      <div class="v57d1-actions"><button type="button" class="primary" data-v57d1-copy>Copy Plan</button><button type="button" class="outline" data-v57d1-select>Select All</button></div>
      <div class="v57d1-note">If your browser blocks automatic clipboard access, the plan remains selected here so you can press Ctrl+C (or Copy on mobile).</div>
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

  function showOverlay(text,message='Automatic clipboard access is blocked here. The plan is ready to copy manually.'){
    const root = ensureOverlay();
    const area = root.querySelector(`#${TEXTAREA_ID}`);
    const feedback = root.querySelector('[data-v57d1-feedback]');
    if (area) area.value = String(text || '');
    if (feedback){ feedback.textContent = message; feedback.className = 'feedback try'; }
    root.classList.remove('hidden');
    window.setTimeout(selectPlan,0);
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
    const syncOk = legacyCopy(text);
    const ok = syncOk || await clipboardCopy(text);
    if (feedback){
      feedback.textContent = ok ? 'Teaching focus plan copied.' : 'Clipboard access is still blocked. The full plan is selected — press Ctrl+C or use Copy on your device.';
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

  async function handleCopyClick(event){
    const button = event.target?.closest?.('[data-v57d-copy]');
    if (!button) return;

    // Capture at window level so the original delegated V5.7D handler does not
    // consume the click first. This keeps the user gesture available for the
    // synchronous clipboard fallback used by embedded deploy previews.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Preparing…';
    try {
      const text = await loadPlan();
      if (!text){
        setFeedback('There is not enough Past Paper evidence to copy yet.','warn');
        return;
      }

      // The async analytics read can consume transient clipboard activation in
      // some embedded browsers. Try the legacy copy first; if neither method is
      // permitted, always expose the complete plan in an in-app selectable view.
      const syncOk = legacyCopy(text);
      const ok = syncOk || await clipboardCopy(text);
      if (ok){
        setFeedback('Teaching focus plan copied to the clipboard.','ok');
      } else {
        setFeedback('Clipboard access is blocked in this browser. The plan has been opened for manual copy.','warn');
        showOverlay(text);
      }
    } catch(error){
      console.warn('V5.7D.1 focus plan copy failed.',error);
      setFeedback('Automatic copy failed. The plan has been opened so you can copy it manually.','warn');
      try {
        const selected = selectionFromUi();
        if (selected){
          const {data} = await cloud.rpc(RPC_NAME,{p_class_id:selected.classId,p_exam_year:selected.examYear,p_paper:selected.paper});
          const text = ROOT.V57DPastPaperAnalyticsActions?.focusPlanText?.(data || {}) || '';
          if (text) showOverlay(text,'Automatic copy failed. Select the plan and copy it manually.');
        }
      } catch {}
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function install(){
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    injectStyles();
    // Window capture runs before V5.7D's document-capture delegated click handler.
    window.addEventListener('click',handleCopyClick,true);
    document.addEventListener('keydown',event=>{ if (event.key === 'Escape') closeOverlay(); });
    return true;
  }

  const api = Object.freeze({RPC_NAME,selectionFromUi,legacyCopy,clipboardCopy});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V57D1FocusPlanCopyFallback',{value:api,writable:false,configurable:false});
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
    else install();
  }
})();
