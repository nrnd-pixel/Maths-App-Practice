/* V5.1B3 — guarded ownership of the legacy bulk Exam Settings save action.
   Intercepts V4.3D Save selected, validates all selected cards, confirms any
   publish/unpublish transitions once, and saves atomically through the B3 batch RPC. */
(() => {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__v51ExamPublicationBulkGuardInstalled) return;
  window.__v51ExamPublicationBulkGuardInstalled = true;

  let queued = false;
  let saving = false;

  const trim = value => String(value ?? '').trim();

  function cloudTeacherReady(){
    try { return !!(cloudReady && teacherUser && cloud); } catch { return false; }
  }

  function feedback(kind,message){
    const root = document.getElementById('v43d-feedback') || document.getElementById('exam-settings-feedback');
    if (!root) return;
    root.className = `feedback ${kind}${root.id === 'v43d-feedback' ? ' v43d-feedback' : ''}`;
    root.textContent = message;
    root.classList.remove('hidden');
  }

  function selectedCards(){
    return [...document.querySelectorAll('#exam-settings-list .settings-card')]
      .filter(card => card.querySelector('.v43d-card-select')?.checked === true);
  }

  function payloadFor(card){
    const durationRaw = trim(card.querySelector('.setting-duration')?.value);
    const duration = durationRaw ? Number(durationRaw) : null;
    if (duration !== null && (!Number.isFinite(duration) || duration < 1 || duration > 600)){
      throw new Error(`${card.dataset.examYear} · ${card.dataset.paper}: duration must be between 1 and 600 minutes.`);
    }
    return Object.freeze({
      year_level:Number(card.dataset.year),
      exam_year:Number(card.dataset.examYear),
      paper:trim(card.dataset.paper),
      duration_minutes:duration,
      answer_release_rule:trim(card.querySelector('.setting-release')?.value) || 'after_manual_review',
      is_available:card.querySelector('.setting-available')?.value === 'true',
      current_available:card.dataset.v51b3CurrentAvailable === 'true'
    });
  }

  function transitionSummary(payloads){
    const publishes = payloads.filter(item => !item.current_available && item.is_available);
    const unpublishes = payloads.filter(item => item.current_available && !item.is_available);
    return {publishes,unpublishes};
  }

  function confirmationText(payloads){
    const {publishes,unpublishes} = transitionSummary(payloads);
    if (!publishes.length && !unpublishes.length) return '';
    const lines = [`Save guarded settings for ${payloads.length} selected paper${payloads.length===1?'':'s'}?`];
    if (publishes.length){
      lines.push('',`Publish ${publishes.length}: ${publishes.map(p=>`${p.exam_year} ${p.paper}`).join(', ')}`,'Students will be able to start these exams immediately.');
    }
    if (unpublishes.length){
      lines.push('',`Unpublish ${unpublishes.length}: ${unpublishes.map(p=>`${p.exam_year} ${p.paper}`).join(', ')}`,'Existing results are preserved; students will no longer be able to start these papers.');
    }
    lines.push('','All selected papers are saved atomically. If any publication fails readiness, none of the batch is saved.');
    return lines.join('\n');
  }

  function setBusy(button,busy,count=0){
    if (!button) return;
    if (busy){
      button.dataset.v51b3PreviousText = button.textContent;
      button.textContent = `Saving ${count} safely…`;
    } else {
      button.textContent = button.dataset.v51b3PreviousText || 'Save selected';
      delete button.dataset.v51b3PreviousText;
    }
    button.disabled = !!busy;
    document.getElementById('v43d-apply-selected')?.toggleAttribute('disabled',!!busy);
  }

  async function saveSelectedGuarded(button){
    if (saving) return;
    const cards = selectedCards();
    if (!cards.length){ feedback('try','Select at least one paper first.'); return; }
    if (!cloudTeacherReady()){ feedback('incorrect','Guarded bulk Exam Settings require Cloud Teacher mode.'); return; }

    let payloads;
    try { payloads = cards.map(payloadFor); }
    catch (error){ feedback('try',error.message || String(error)); return; }

    const confirmText = confirmationText(payloads);
    if (confirmText && !window.confirm(confirmText)) return;

    const items = payloads.map(({current_available,...item})=>item);
    saving = true;
    setBusy(button,true,items.length);
    feedback('try','Saving selected papers through the V5.1B3 publication guard…');

    let data = null, error = null;
    try {
      ({data,error} = await cloud.rpc('save_exam_paper_settings_batch_v51b3',{p_items:items}));
    } catch (err){ error = err; }

    if (error){
      feedback('incorrect',error.message || String(error));
      saving = false;
      setBusy(button,false);
      return;
    }

    const count = Number(data?.saved_count) || items.length;
    feedback('correct',`Saved settings safely for ${count} paper${count===1?'':'s'}.`);
    document.getElementById('v43d-clear-selection')?.click();
    try {
      if (typeof window.loadExamSettingsEditor === 'function') await window.loadExamSettingsEditor();
      if (typeof loadExamOptions === 'function') await loadExamOptions();
    } catch (err){ console.warn('V5.1B3 post-save refresh warning',err); }
    saving = false;
    setBusy(document.getElementById('v43d-save-selected'),false);
  }

  function wire(){
    const button = document.getElementById('v43d-save-selected');
    if (!button || button.dataset.v51b3BulkGuard === '1') return false;
    button.dataset.v51b3BulkGuard = '1';
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      saveSelectedGuarded(button);
    },true);
    return true;
  }

  function schedule(){
    if (queued) return;
    queued = true;
    setTimeout(()=>{ queued=false; wire(); },0);
  }

  window.V51ExamPublicationBulkGuard = Object.freeze({selectedCards,payloadFor,transitionSummary,confirmationText,wire,saveSelectedGuarded});

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
})();
