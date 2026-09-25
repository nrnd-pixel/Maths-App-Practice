/* V5.1B3 — Exam Paper Publication Safety.
   Hardens the existing Exam Settings editor. Missing settings default to unavailable,
   publication requires server readiness, and writes use guarded teacher RPCs. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51ExamPublicationSafetyInstalled) return;
  if (typeof window !== 'undefined') window.__v51ExamPublicationSafetyInstalled = true;

  const readinessByKey = new Map();
  const trim = value => String(value ?? '').trim();
  const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function keyOf(yearLevel,examYear,paper){
    return `${Number(yearLevel)||0}|${Number(examYear)||0}|${trim(paper).toLowerCase()}`;
  }

  function safeMissingSetting(saved){
    if (saved) return Object.freeze({
      exists:true,
      is_available:saved.is_available === true,
      duration_minutes:saved.duration_minutes ?? null,
      answer_release_rule:trim(saved.answer_release_rule) || 'after_manual_review'
    });
    return Object.freeze({exists:false,is_available:false,duration_minutes:null,answer_release_rule:'after_manual_review'});
  }

  function canPublish(readiness){ return readiness?.ready === true; }

  function availabilityTransition(currentAvailable,targetAvailable){
    const current = currentAvailable === true;
    const target = targetAvailable === true;
    if (!current && target) return 'publish';
    if (current && !target) return 'unpublish';
    return 'none';
  }

  function blockerCount(readiness){
    if (!readiness) return 0;
    return ['metadata_blockers','image_blockers','review_blockers','duplicate_groups','ungrouped_multipart_rows','multipart_blocker_groups']
      .reduce((sum,key)=>sum + (Number(readiness[key])||0),0);
  }

  function readinessText(readiness){
    if (!readiness) return 'Readiness unavailable';
    const logical = `${Number(readiness.logical_questions)||0}/${readiness.expected_logical_questions ?? '—'} logical questions`;
    const marks = `${Number(readiness.total_marks)||0}/${Number(readiness.expected_marks)||90} marks`;
    const blockers = blockerCount(readiness);
    return `${logical} • ${marks} • ${blockers} QA blocker${blockers===1?'':'s'}`;
  }

  if (typeof window !== 'undefined'){
    window.V51ExamPublicationSafety = Object.freeze({keyOf,safeMissingSetting,canPublish,availabilityTransition,blockerCount,readinessText});
  }

  let baseLoad = null;
  try { if (typeof loadExamSettingsEditor === 'function') baseLoad = loadExamSettingsEditor; } catch {}
  if (!baseLoad) {
    /*
      Item 4 — visible failure: the entire safety layer is skipped if the base
      function is absent. Log clearly (not just silently return) so this surfaces
      in browser devtools. Also inject a visible UI message if the feedback element
      exists, because a teacher would otherwise see the unguarded legacy editor
      with no indication that the hardening layer failed to install.
    */
    console.error(
      'V5.1B3 Exam Publication Safety: loadExamSettingsEditor was not found at install ' +
      'time. The guarded editor could not be installed. Check the load order in v40-release.js.'
    );
    if (typeof document !== 'undefined') {
      const fb = document.getElementById('exam-settings-feedback');
      if (fb) {
        fb.className = 'feedback incorrect';
        fb.textContent = 'V5.1B3 safety layer failed to initialise. Exam publication controls are unguarded. Please reload.';
      }
    }
    return;
  }

  function cloudTeacherReady(){
    try { return !!(cloudReady && teacherUser && cloud); } catch { return false; }
  }

  function feedback(kind,message){
    if (typeof document === 'undefined') return;
    const root = document.getElementById('exam-settings-feedback');
    if (!root) return;
    root.className = `feedback ${kind}`;
    root.textContent = message;
  }

  function bulkFeedback(kind,message){
    if (typeof document === 'undefined') return;
    const root = document.getElementById('v43d-feedback');
    if (root){
      root.className = `feedback ${kind} v43d-feedback`;
      root.textContent = message;
      root.classList.remove('hidden');
    }
    feedback(kind,message);
  }

  function cardPayload(card){
    const durationInput = card.querySelector('.setting-duration');
    const release = card.querySelector('.setting-release');
    const available = card.querySelector('.setting-available');
    const rawDuration = trim(durationInput?.value);
    return Object.freeze({
      year_level:Number(card.dataset.year),
      exam_year:Number(card.dataset.examYear),
      paper:trim(card.dataset.paper),
      duration_minutes:rawDuration ? Number(rawDuration) : null,
      answer_release_rule:trim(release?.value) || 'after_manual_review',
      is_available:available?.value === 'true'
    });
  }

  function validatePayload(payload){
    if (!Number.isInteger(payload.year_level) || payload.year_level < 1 || payload.year_level > 13) return 'Invalid year level.';
    if (!Number.isInteger(payload.exam_year) || payload.exam_year < 2000 || payload.exam_year > 2100) return 'Invalid exam year.';
    if (!payload.paper) return 'Paper is required.';
    if (payload.duration_minutes !== null && (!Number.isFinite(payload.duration_minutes) || payload.duration_minutes < 1 || payload.duration_minutes > 600)) return `${payload.exam_year} · ${payload.paper}: duration must be between 1 and 600 minutes, or blank for no timer.`;
    if (!['immediate','after_manual_review','never'].includes(payload.answer_release_rule)) return `${payload.exam_year} · ${payload.paper}: invalid answer release rule.`;
    return '';
  }

  function disableCard(card,disabled){
    card.querySelectorAll('input,select,button').forEach(el=>{ el.disabled = !!disabled; });
  }

  function renderReadiness(card,readiness,savedState){
    const fields = card.querySelector('.settings-fields');
    if (!fields) return;
    let root = card.querySelector('.v51b3-readiness');
    if (!root){
      root = document.createElement('div');
      root.className = 'v51b3-readiness info';
      fields.insertAdjacentElement('afterend',root);
    }

    const reasons = Array.isArray(readiness?.reasons) ? readiness.reasons : [];
    const ready = canPublish(readiness);
    root.innerHTML = `
      <div class="pills" style="margin-bottom:6px">
        <span class="tag ${ready?'status-active':'status-inactive'}">${ready?'✓ Ready to publish':'⚠ Not ready to publish'}</span>
        <span class="tag">${savedState.exists?'Settings saved':'No settings row'}</span>
      </div>
      <strong>Publication readiness</strong>
      <div>${esc(readinessText(readiness))}</div>
      ${reasons.length?`<div class="help" style="margin-top:5px">${reasons.map(esc).join(' • ')}</div>`:'<div class="help" style="margin-top:5px">Server readiness checks passed.</div>'}
      <div class="help" style="margin-top:5px">Published papers are protected from question-bank changes that would break readiness.</div>`;
  }

  function applySavedState(card,saved){
    const state = safeMissingSetting(saved);
    const available = card.querySelector('.setting-available');
    const release = card.querySelector('.setting-release');
    const duration = card.querySelector('.setting-duration');
    const badge = card.querySelector('.settings-card-head .tag');

    card.dataset.v51b3SettingExists = state.exists ? 'true' : 'false';
    card.dataset.v51b3CurrentAvailable = state.is_available ? 'true' : 'false';
    if (available) available.value = state.is_available ? 'true' : 'false';
    if (release) release.value = state.answer_release_rule;
    if (duration) duration.value = state.duration_minutes == null ? '' : String(state.duration_minutes);
    if (badge){
      badge.textContent = state.exists ? (state.is_available ? 'Available' : 'Unavailable') : 'Not configured · Unavailable';
      badge.classList.toggle('availability-on',state.is_available);
      badge.classList.toggle('availability-off',!state.is_available);
    }
    return state;
  }

  async function loadReadiness(card){
    const params = {
      p_year_level:Number(card.dataset.year),
      p_exam_year:Number(card.dataset.examYear),
      p_paper:trim(card.dataset.paper)
    };
    const {data,error} = await cloud.rpc('get_exam_paper_readiness_v51b3',params);
    if (error) throw error;
    const readiness = data || null;
    readinessByKey.set(keyOf(params.p_year_level,params.p_exam_year,params.p_paper),readiness);
    return readiness;
  }

  function selectedBulkCards(){
    if (typeof document === 'undefined') return [];
    return [...document.querySelectorAll('#exam-settings-list .settings-card')]
      .filter(card => card.querySelector('.v43d-card-select')?.checked === true || card.classList.contains('v43d-selected'));
  }

  function cardLabel(card){ return `${trim(card.dataset.examYear)} · ${trim(card.dataset.paper)}`; }

  async function readinessForPublishingCard(card){
    const key = keyOf(card.dataset.year,card.dataset.examYear,card.dataset.paper);
    let readiness = readinessByKey.get(key) || null;
    if (!readiness) readiness = await loadReadiness(card);
    return readiness;
  }

  function blockUnsafeBulkApply(event){
    const availability = document.getElementById('v43d-availability')?.value || '';
    if (availability !== 'true') return;
    const targets = selectedBulkCards();
    const blocked = targets.filter(card => {
      const current = card.dataset.v51b3CurrentAvailable === 'true';
      const readiness = readinessByKey.get(keyOf(card.dataset.year,card.dataset.examYear,card.dataset.paper));
      return !current && !canPublish(readiness);
    });
    if (!blocked.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    bulkFeedback('incorrect',`Cannot apply Available to: ${blocked.map(cardLabel).join(', ')}. At least one selected paper is not publish-ready.`);
  }

  async function safeBulkSave(){
    const targets = selectedBulkCards();
    if (!targets.length){ bulkFeedback('try','Select at least one paper first.'); return; }
    if (!cloudTeacherReady()){ bulkFeedback('incorrect','Teacher cloud access is not ready.'); return; }

    const payloads = targets.map(cardPayload);
    const validation = payloads.map(validatePayload).find(Boolean);
    if (validation){ bulkFeedback('incorrect',validation); return; }

    const publishing = [];
    const unpublishing = [];
    for (let i=0;i<targets.length;i+=1){
      const card = targets[i];
      const payload = payloads[i];
      const transition = availabilityTransition(card.dataset.v51b3CurrentAvailable === 'true',payload.is_available);
      if (transition === 'publish'){
        let readiness;
        try { readiness = await readinessForPublishingCard(card); }
        catch (err){ bulkFeedback('incorrect',err.message || String(err)); return; }
        if (!canPublish(readiness)){
          const reasons = Array.isArray(readiness?.reasons) && readiness.reasons.length ? readiness.reasons.join(' • ') : 'Server readiness did not pass.';
          bulkFeedback('incorrect',`Bulk save blocked before any change. ${cardLabel(card)}: ${reasons}`);
          return;
        }
        publishing.push(cardLabel(card));
      } else if (transition === 'unpublish'){
        unpublishing.push(cardLabel(card));
      }
    }

    if (publishing.length || unpublishing.length){
      const lines = [];
      if (publishing.length) lines.push(`Publish: ${publishing.join(', ')}\nStudents will be able to start these exams immediately after the save.`);
      if (unpublishing.length) lines.push(`Unpublish: ${unpublishing.join(', ')}\nExisting results are preserved; students will no longer be able to start these papers.`);
      const ok = window.confirm(`Save ${payloads.length} selected Exam Settings?\n\n${lines.join('\n\n')}\n\nThe full batch is validated before any write.`);
      if (!ok) return;
    }

    const button = document.getElementById('v43d-save-selected');
    const applyButton = document.getElementById('v43d-apply-selected');
    if (button) button.disabled = true;
    if (applyButton) applyButton.disabled = true;
    bulkFeedback('try',`Saving ${payloads.length} guarded paper setting${payloads.length===1?'':'s'}…`);

    let data = null, error = null;
    try {
      ({data,error} = await cloud.rpc('save_exam_paper_settings_bulk_v51b3',{p_settings:payloads}));
    } catch (err){ error = err; }

    if (error){
      if (button) button.disabled = false;
      if (applyButton) applyButton.disabled = false;
      bulkFeedback('incorrect',error.message || String(error));
      return;
    }

    const savedCount = Number(data?.saved_count) || payloads.length;
    bulkFeedback('correct',`Saved ${savedCount} paper setting${savedCount===1?'':'s'} safely in one transaction.`);
    readinessByKey.clear();
    document.getElementById('v43d-clear-selection')?.click();
    await hardenedLoadExamSettingsEditor();
    try { if (typeof loadExamOptions === 'function') await loadExamOptions(); } catch {}
  }

  function hardenBulkTools(){
    if (typeof document === 'undefined') return;
    const applyButton = document.getElementById('v43d-apply-selected');
    if (applyButton && applyButton.dataset.v51b3Guard !== '1'){
      applyButton.dataset.v51b3Guard = '1';
      applyButton.addEventListener('click',blockUnsafeBulkApply,true);
    }

    const oldSave = document.getElementById('v43d-save-selected');
    if (oldSave && oldSave.dataset.v51b3Guard !== '1'){
      const safeSave = oldSave.cloneNode(true);
      safeSave.dataset.v51b3Guard = '1';
      safeSave.textContent = 'Save selected safely';
      oldSave.replaceWith(safeSave);
      safeSave.addEventListener('click',safeBulkSave);
    }
  }

  async function hardenedLoadExamSettingsEditor(){
    await baseLoad();
    if (!cloudTeacherReady() || typeof document === 'undefined') return;

    const cards = [...document.querySelectorAll('#exam-settings-list .settings-card')];
    if (!cards.length) return;
    cards.forEach(card=>disableCard(card,true));

    const {data:settings,error:settingsError} = await cloud.from('exam_paper_settings').select('*');
    if (settingsError){
      cards.forEach(card=>disableCard(card,false));
      feedback('incorrect',`Could not load guarded Exam Settings. ${settingsError.message}`);
      return;
    }
    const savedMap = new Map((settings||[]).map(s=>[keyOf(s.year_level,s.exam_year,s.paper),s]));

    let readyCount = 0, blockedCount = 0, missingCount = 0;
    await Promise.all(cards.map(async card=>{
      const key = keyOf(card.dataset.year,card.dataset.examYear,card.dataset.paper);
      const saved = savedMap.get(key) || null;
      const state = applySavedState(card,saved);
      if (!state.exists) missingCount += 1;
      try {
        const readiness = await loadReadiness(card);
        if (canPublish(readiness)) readyCount += 1; else blockedCount += 1;
        renderReadiness(card,readiness,state);
        const available = card.querySelector('.setting-available');
        if (available){
          const publishOption = [...available.options].find(option=>option.value==='true');
          if (publishOption) publishOption.disabled = !canPublish(readiness) && !state.is_available;
        }
      } catch (err){
        blockedCount += 1;
        renderReadiness(card,null,state);
        const available = card.querySelector('.setting-available');
        if (available){
          const publishOption = [...available.options].find(option=>option.value==='true');
          if (publishOption) publishOption.disabled = !state.is_available;
        }
      }
      const save = card.querySelector('.save-exam-setting');
      if (save) save.textContent = 'Save guarded settings';
      disableCard(card,false);
    }));

    hardenBulkTools();

    let summary = document.getElementById('v51b3-exam-publication-summary');
    const list = document.getElementById('exam-settings-list');
    if (!summary && list){
      summary = document.createElement('div');
      summary.id = 'v51b3-exam-publication-summary';
      summary.className = 'info';
      list.insertAdjacentElement('beforebegin',summary);
    }
    if (summary) summary.innerHTML = `<strong>V5.1B3 — Exam Paper Publication Safety</strong><br>${readyCount} publish-ready • ${blockedCount} blocked • ${missingCount} without saved settings. Missing settings default to Unavailable; publication requires one confirmation and server readiness. Bulk Save selected is atomic.`;
  }

  async function hardenedSaveExamSetting(card){
    if (!card || !cloudTeacherReady()){
      feedback('incorrect','Guarded Exam Settings require Cloud Teacher mode.');
      return;
    }
    const payload = cardPayload(card);
    const validation = validatePayload(payload);
    if (validation){ feedback('incorrect',validation); return; }

    const key = keyOf(payload.year_level,payload.exam_year,payload.paper);
    let readiness = readinessByKey.get(key) || null;
    if (!readiness){
      try { readiness = await loadReadiness(card); }
      catch (err){ feedback('incorrect',err.message || String(err)); return; }
    }

    const currentAvailable = card.dataset.v51b3CurrentAvailable === 'true';
    const transition = availabilityTransition(currentAvailable,payload.is_available);
    if (transition === 'publish' && !canPublish(readiness)){
      const reasons = Array.isArray(readiness?.reasons) && readiness.reasons.length ? readiness.reasons.join(' • ') : 'Server readiness did not pass.';
      feedback('incorrect',`Publication blocked. ${reasons}`);
      return;
    }

    if (transition === 'publish'){
      const ok = window.confirm(`Publish Year ${payload.year_level} · ${payload.exam_year} · ${payload.paper} in Exam Mode?\n\nStudents will be able to start this exam immediately after this save.\n\nReadiness: ${readinessText(readiness)}`);
      if (!ok) return;
    } else if (transition === 'unpublish'){
      const ok = window.confirm(`Make ${payload.exam_year} · ${payload.paper} unavailable in Exam Mode?\n\nExisting results are preserved; students will no longer be able to start this paper.`);
      if (!ok) return;
    }

    disableCard(card,true);
    feedback('try','Saving guarded Exam Settings…');
    let error = null;
    try {
      ({error} = await cloud.rpc('save_exam_paper_setting_v51b3',{
        p_year_level:payload.year_level,
        p_exam_year:payload.exam_year,
        p_paper:payload.paper,
        p_duration_minutes:payload.duration_minutes,
        p_answer_release_rule:payload.answer_release_rule,
        p_is_available:payload.is_available
      }));
    } catch (err){ error = err; }

    if (error){
      disableCard(card,false);
      feedback('incorrect',error.message || String(error));
      return;
    }

    feedback('correct',`${payload.exam_year} · ${payload.paper} settings saved safely.${transition==='publish'?' Paper is now available.':transition==='unpublish'?' Paper is now unavailable.':''}`);
    readinessByKey.delete(key);
    await hardenedLoadExamSettingsEditor();
    try { if (typeof loadExamOptions === 'function') await loadExamOptions(); } catch {}
  }

  try { loadExamSettingsEditor = hardenedLoadExamSettingsEditor; } catch {}
  try { saveExamSetting = hardenedSaveExamSetting; } catch {}
  try { window.loadExamSettingsEditor = hardenedLoadExamSettingsEditor; window.saveExamSetting = hardenedSaveExamSetting; } catch {}
})();
