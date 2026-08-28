/* V5.1B2B — Safe bulk metadata editing for Question Bank.
   Reuses B2A selection controls and allows only a fixed low-risk metadata whitelist.
   No answers, marks, response configuration, exam identity, multipart, images, active status,
   Exam Settings, Storage or student-data changes. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51QuestionBankBulkMetadataInstalled) return;
  if (typeof window !== 'undefined') window.__v51QuestionBankBulkMetadataInstalled = true;

  const mirroredSelectedIds = new Set();
  let busy = false;

  const ALLOWED_FIELDS = Object.freeze(['strand','topic','subtopic','skill','difficulty','source_type']);
  const REQUIRED_TEXT_FIELDS = new Set(['topic','skill']);
  const STRAND_VALUES = Object.freeze(['number','geometry','measurement','statistics','thinking']);
  const DIFFICULTY_VALUES = Object.freeze(['foundation','standard','challenge']);
  const SOURCE_TYPE_VALUES = Object.freeze(['past_paper','practice','topical_exercise','teacher']);
  const FIELD_LABELS = Object.freeze({
    strand:'Strand', topic:'Topic', subtopic:'Subtopic', skill:'Skill',
    difficulty:'Difficulty', source_type:'Source type'
  });

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function currentQuestions(){
    try { if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions; } catch {}
    return [];
  }

  function cloudTeacherReady(){
    try { return !!(cloudReady && teacherUser && cloud); } catch { return false; }
  }

  function normalizeFieldValue(field,value){
    if (!ALLOWED_FIELDS.includes(field)) return undefined;
    const text = trim(value);
    if (field === 'strand' || field === 'difficulty' || field === 'source_type') return norm(text).replace(/\s+/g,'_');
    return text;
  }

  function validatePatch(rawPatch){
    const patch = {};
    const errors = [];
    for (const field of Object.keys(rawPatch || {})){
      if (!ALLOWED_FIELDS.includes(field)){
        errors.push(`Protected or unsupported field: ${field}`);
        continue;
      }
      const value = normalizeFieldValue(field,rawPatch[field]);
      if (field === 'strand' && !STRAND_VALUES.includes(value)) errors.push('Choose a supported strand.');
      else if (field === 'difficulty' && !DIFFICULTY_VALUES.includes(value)) errors.push('Choose foundation, standard or challenge.');
      else if (field === 'source_type' && !SOURCE_TYPE_VALUES.includes(value)) errors.push('Choose a supported source type.');
      else if (REQUIRED_TEXT_FIELDS.has(field) && !value) errors.push(`${FIELD_LABELS[field]} cannot be blank.`);
      else patch[field] = value;
    }
    return Object.freeze({patch:Object.freeze(patch),errors:Object.freeze(errors)});
  }

  function sameValue(field,a,b){
    if (field === 'strand' || field === 'difficulty' || field === 'source_type') return normalizeFieldValue(field,a) === normalizeFieldValue(field,b);
    return trim(a) === trim(b);
  }

  function rowLabel(row){
    const exam = [row?.exam_year,row?.paper,row?.question_number ? `Q${row.question_number}` : ''].filter(Boolean).join(' ');
    return exam || trim(row?.question_text).slice(0,60) || String(row?.id ?? '');
  }

  function buildMetadataPlan(rows=currentQuestions(),ids=mirroredSelectedIds,rawPatch={}){
    const selected = (rows || []).filter(row => ids.has(String(row.id)));
    const validated = validatePatch(rawPatch);
    const fields = Object.keys(validated.patch);
    const changing = [];
    const fieldCounts = Object.fromEntries(fields.map(field=>[field,0]));
    const sourceTypeWarnings = [];
    const blockers = [...validated.errors];

    for (const row of selected){
      const changedFields = fields.filter(field => !sameValue(field,row[field],validated.patch[field]));
      if (!changedFields.length) continue;

      if (changedFields.includes('source_type')){
        const target = validated.patch.source_type;
        if (target === 'past_paper'){
          if (!Number.isFinite(Number(row.exam_year)) || !trim(row.paper) || !trim(row.question_number)){
            blockers.push(`${rowLabel(row)} cannot become past_paper because exam year, paper or question number is missing.`);
          }
        }
        if (norm(row.source_type) === 'past_paper' || target === 'past_paper') sourceTypeWarnings.push(row);
      }

      changedFields.forEach(field=>{ fieldCounts[field] += 1; });
      changing.push(Object.freeze({row,changedFields:Object.freeze(changedFields)}));
    }

    const uniqueBlockers = [...new Set(blockers)];
    return Object.freeze({
      selected:Object.freeze(selected.slice()),
      patch:validated.patch,
      fields:Object.freeze(fields),
      changing:Object.freeze(changing),
      fieldCounts:Object.freeze(fieldCounts),
      blockers:Object.freeze(uniqueBlockers),
      sourceTypeWarnings:Object.freeze(sourceTypeWarnings.slice()),
      canRun:selected.length>0 && fields.length>0 && changing.length>0 && uniqueBlockers.length===0
    });
  }

  function confirmationText(plan){
    const fieldSummary = plan.fields.map(field=>`${FIELD_LABELS[field]} (${plan.fieldCounts[field]} row${plan.fieldCounts[field]===1?'':'s'})`).join(', ');
    const lines = [
      `Update metadata for ${plan.changing.length} question${plan.changing.length===1?'':'s'}?`,
      '',
      `Fields: ${fieldSummary}`,
      '',
      'Only the enabled metadata fields will change.',
      'Answers, marks, response types, exam identity, multipart structure, images and active status will not change.'
    ];
    if (plan.sourceTypeWarnings.length){
      lines.push('',`${plan.sourceTypeWarnings.length} selected row${plan.sourceTypeWarnings.length===1?' touches':'s touch'} past-paper classification. This may change Question Bank paper-profile counts, but no Exam Setting will be created or enabled.`);
    }
    lines.push('','This writes to the configured Supabase question bank.');
    return lines.join('\n');
  }

  function selectedRows(){
    const rows = currentQuestions();
    return rows.filter(row=>mirroredSelectedIds.has(String(row.id)));
  }

  function syncRenderedCheckboxes(){
    if (typeof document === 'undefined') return;
    document.querySelectorAll('#questions-cards .v51b2a-select').forEach(box=>{
      const id = String(box.dataset.id || box.closest('.qcard')?.dataset?.v51b2aId || '');
      if (!id) return;
      if (box.checked) mirroredSelectedIds.add(id);
      else mirroredSelectedIds.delete(id);
    });
  }

  function b2aSelectedCountFromText(){
    const text = document.getElementById('v51b2a-summary')?.textContent || '';
    const match = text.match(/(\d+)\s+selected/i);
    return match ? Number(match[1]) : mirroredSelectedIds.size;
  }

  function ensurePanel(){
    if (typeof document === 'undefined') return null;
    let panel = document.getElementById('v51b2b-bulk-metadata');
    if (panel) return panel;
    const b2a = document.getElementById('v51b2a-bulk-status');
    if (!b2a) return null;

    panel = document.createElement('section');
    panel.id = 'v51b2b-bulk-metadata';
    panel.className = 'info';
    panel.style.marginBottom = '12px';
    panel.innerHTML = `
      <div class="header" style="align-items:center;gap:10px">
        <div>
          <strong>V5.1B2B — Bulk metadata</strong>
          <div class="help">Uses the B2A selection. Tick only the fields you want to replace, preview the changes, then confirm once.</div>
        </div>
        <button id="v51b2b-reset" class="outline" type="button">Reset fields</button>
      </div>
      <div id="v51b2b-fields" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:12px">
        <label class="checkline" style="align-items:flex-start"><input type="checkbox" data-v51b2b-enable="strand"><span style="flex:1"><strong>Strand</strong><select id="v51b2b-strand" disabled><option value="number">Number</option><option value="geometry">Geometry</option><option value="measurement">Measurement</option><option value="statistics">Statistics</option><option value="thinking">Thinking</option></select></span></label>
        <label class="checkline" style="align-items:flex-start"><input type="checkbox" data-v51b2b-enable="topic"><span style="flex:1"><strong>Topic</strong><input id="v51b2b-topic" type="text" placeholder="Replacement topic" disabled></span></label>
        <label class="checkline" style="align-items:flex-start"><input type="checkbox" data-v51b2b-enable="subtopic"><span style="flex:1"><strong>Subtopic</strong><input id="v51b2b-subtopic" type="text" placeholder="Blank clears subtopic" disabled></span></label>
        <label class="checkline" style="align-items:flex-start"><input type="checkbox" data-v51b2b-enable="skill"><span style="flex:1"><strong>Skill</strong><input id="v51b2b-skill" type="text" placeholder="Replacement skill" disabled></span></label>
        <label class="checkline" style="align-items:flex-start"><input type="checkbox" data-v51b2b-enable="difficulty"><span style="flex:1"><strong>Difficulty</strong><select id="v51b2b-difficulty" disabled><option value="foundation">Foundation</option><option value="standard" selected>Standard</option><option value="challenge">Challenge</option></select></span></label>
        <label class="checkline" style="align-items:flex-start"><input type="checkbox" data-v51b2b-enable="source_type"><span style="flex:1"><strong>Source type</strong><select id="v51b2b-source-type" disabled><option value="past_paper">Past paper</option><option value="practice">Practice</option><option value="topical_exercise">Topical exercise</option><option value="teacher">Teacher-created</option></select></span></label>
      </div>
      <div class="toolbar" style="margin-top:12px">
        <button id="v51b2b-preview" class="outline" type="button">Preview metadata changes</button>
        <button id="v51b2b-apply" class="primary" type="button" disabled>Apply metadata changes</button>
      </div>
      <div id="v51b2b-summary" class="help" style="margin-top:10px">0 selected · no fields enabled</div>
      <div id="v51b2b-preview-box" class="hidden" style="margin-top:10px"></div>
      <div id="v51b2b-feedback" class="feedback hidden" role="status" aria-live="polite"></div>`;
    b2a.insertAdjacentElement('afterend',panel);
    return panel;
  }

  function fieldElement(field){
    const map = {
      strand:'v51b2b-strand', topic:'v51b2b-topic', subtopic:'v51b2b-subtopic',
      skill:'v51b2b-skill', difficulty:'v51b2b-difficulty', source_type:'v51b2b-source-type'
    };
    return document.getElementById(map[field]);
  }

  function collectPatch(){
    const patch = {};
    document.querySelectorAll('[data-v51b2b-enable]').forEach(box=>{
      if (!box.checked) return;
      const field = box.dataset.v51b2bEnable;
      const input = fieldElement(field);
      if (input) patch[field] = input.value;
    });
    return patch;
  }

  function setFeedback(kind,message){
    const root = document.getElementById('v51b2b-feedback');
    if (!root) return;
    root.className = `feedback ${kind}`;
    root.innerHTML = message;
  }

  function clearFeedback(){
    const root = document.getElementById('v51b2b-feedback');
    if (!root) return;
    root.className = 'feedback hidden';
    root.innerHTML = '';
  }

  function renderPreview(plan){
    const root = document.getElementById('v51b2b-preview-box');
    if (!root) return;
    root.classList.remove('hidden');
    const changeRows = plan.fields.map(field=>{
      const value = plan.patch[field] === '' ? '— clear —' : plan.patch[field];
      return `<div><strong>${esc(FIELD_LABELS[field])}</strong> → ${esc(value)} <span class="muted">(${esc(plan.fieldCounts[field])} row${plan.fieldCounts[field]===1?'':'s'} changing)</span></div>`;
    }).join('');
    const examples = plan.changing.slice(0,8).map(item=>`<div>${esc(rowLabel(item.row))} — ${esc(item.changedFields.map(field=>FIELD_LABELS[field]).join(', '))}</div>`).join('');
    root.innerHTML = `
      <div style="border:1px solid var(--border);border-radius:12px;background:#fff;padding:12px;display:grid;gap:7px">
        <strong>${esc(plan.changing.length)} question${plan.changing.length===1?'':'s'} will change</strong>
        ${changeRows || '<div>No metadata fields enabled.</div>'}
        ${plan.sourceTypeWarnings.length?`<div class="muted">⚠ ${esc(plan.sourceTypeWarnings.length)} row${plan.sourceTypeWarnings.length===1?' touches':'s touch'} past-paper classification.</div>`:''}
        ${plan.blockers.length?`<div style="color:var(--danger)"><strong>Blocked:</strong><br>${plan.blockers.map(esc).join('<br>')}</div>`:''}
        ${examples?`<div class="muted" style="margin-top:4px"><strong>Examples</strong><br>${examples}${plan.changing.length>8?'<br>…':''}</div>`:''}
      </div>`;
  }

  function renderSummary(){
    if (!ensurePanel()) return null;
    syncRenderedCheckboxes();
    const b2aCount = b2aSelectedCountFromText();
    if (b2aCount === 0) mirroredSelectedIds.clear();

    const patch = collectPatch();
    const plan = buildMetadataPlan(currentQuestions(),mirroredSelectedIds,patch);
    const summary = document.getElementById('v51b2b-summary');
    const apply = document.getElementById('v51b2b-apply');
    const preview = document.getElementById('v51b2b-preview');
    const fieldCount = Object.keys(patch).length;
    const ready = cloudTeacherReady();

    const details = [`${mirroredSelectedIds.size} selected`,`${fieldCount} field${fieldCount===1?'':'s'} enabled`];
    if (plan.changing.length) details.push(`${plan.changing.length} row${plan.changing.length===1?'':'s'} would change`);
    if (plan.blockers.length) details.push(`${plan.blockers.length} blocker${plan.blockers.length===1?'':'s'}`);
    if (!ready) details.push('writes require Cloud Teacher');
    if (summary) summary.textContent = details.join(' • ');
    if (apply) apply.disabled = busy || !ready || !plan.canRun;
    if (preview) preview.disabled = busy || mirroredSelectedIds.size===0 || fieldCount===0;
    return plan;
  }

  function resetFields(){
    document.querySelectorAll('[data-v51b2b-enable]').forEach(box=>{
      box.checked = false;
      const input = fieldElement(box.dataset.v51b2bEnable);
      if (input) input.disabled = true;
    });
    document.getElementById('v51b2b-topic').value='';
    document.getElementById('v51b2b-subtopic').value='';
    document.getElementById('v51b2b-skill').value='';
    document.getElementById('v51b2b-strand').value='number';
    document.getElementById('v51b2b-difficulty').value='standard';
    document.getElementById('v51b2b-source-type').value='past_paper';
    document.getElementById('v51b2b-preview-box').classList.add('hidden');
    clearFeedback();
    renderSummary();
  }

  async function applyChanges(){
    if (busy) return;
    const plan = buildMetadataPlan(currentQuestions(),mirroredSelectedIds,collectPatch());
    renderPreview(plan);
    if (!cloudTeacherReady()){
      setFeedback('incorrect','Bulk metadata changes require Cloud Teacher mode.');
      return;
    }
    if (!plan.selected.length){
      setFeedback('try','Select at least one question first.');
      return;
    }
    if (!plan.fields.length){
      setFeedback('try','Enable at least one metadata field.');
      return;
    }
    if (plan.blockers.length){
      setFeedback('incorrect',`<strong>Metadata update blocked.</strong><br>${plan.blockers.map(esc).join('<br>')}`);
      return;
    }
    if (!plan.changing.length){
      setFeedback('try','The selected questions already have these metadata values.');
      return;
    }
    if (!window.confirm(confirmationText(plan))) return;

    busy = true;
    renderSummary();
    setFeedback('try',`Updating metadata for ${plan.changing.length} question${plan.changing.length===1?'':'s'}…`);
    const ids = plan.changing.map(item=>item.row.id);
    const patch = Object.fromEntries(plan.fields.map(field=>[field,plan.patch[field]]));
    let error = null;
    try {
      ({error} = await cloud.from('questions').update(patch).in('id',ids));
    } catch (err){ error = err; }

    if (error){
      busy = false;
      setFeedback('incorrect',esc(error.message || String(error)));
      renderSummary();
      return;
    }

    mirroredSelectedIds.clear();
    try { window.V51QuestionBankBulkStatus?.clearSelection?.(); } catch {}
    try { await loadTeacher(); } catch (err){ console.warn('Question Bank refresh failed after bulk metadata update:',err); }
    busy = false;
    resetFields();
    setFeedback('correct',`${plan.changing.length} question${plan.changing.length===1?'':'s'} updated successfully.`);
    window.requestAnimationFrame(renderSummary);
  }

  function wire(){
    if (typeof document === 'undefined') return;
    if (!ensurePanel()) return;

    document.querySelectorAll('[data-v51b2b-enable]').forEach(box=>{
      box.addEventListener('change',()=>{
        const input = fieldElement(box.dataset.v51b2bEnable);
        if (input) input.disabled = !box.checked;
        document.getElementById('v51b2b-preview-box')?.classList.add('hidden');
        clearFeedback();
        renderSummary();
      });
    });
    ['strand','topic','subtopic','skill','difficulty','source_type'].forEach(field=>{
      const input = fieldElement(field);
      input?.addEventListener('input',()=>{ document.getElementById('v51b2b-preview-box')?.classList.add('hidden'); renderSummary(); });
      input?.addEventListener('change',()=>{ document.getElementById('v51b2b-preview-box')?.classList.add('hidden'); renderSummary(); });
    });

    document.getElementById('v51b2b-reset')?.addEventListener('click',resetFields);
    document.getElementById('v51b2b-preview')?.addEventListener('click',()=>{
      const plan = renderSummary();
      if (plan) renderPreview(plan);
    });
    document.getElementById('v51b2b-apply')?.addEventListener('click',applyChanges);

    document.addEventListener('change',event=>{
      const box = event.target?.closest?.('.v51b2a-select');
      if (!box) return;
      const id = String(box.dataset.id || box.closest('.qcard')?.dataset?.v51b2aId || '');
      if (id){ if (box.checked) mirroredSelectedIds.add(id); else mirroredSelectedIds.delete(id); }
      window.requestAnimationFrame(renderSummary);
    });
    ['v51b2a-select-visible','v51b2a-clear-selection','v51b2a-activate','v51b2a-deactivate'].forEach(id=>{
      document.getElementById(id)?.addEventListener('click',()=>window.requestAnimationFrame(()=>{
        syncRenderedCheckboxes();
        if (b2aSelectedCountFromText()===0) mirroredSelectedIds.clear();
        renderSummary();
      }));
    });

    const b2aSummary = document.getElementById('v51b2a-summary');
    if (b2aSummary && typeof MutationObserver !== 'undefined'){
      new MutationObserver(()=>window.requestAnimationFrame(()=>{
        syncRenderedCheckboxes();
        if (b2aSelectedCountFromText()===0) mirroredSelectedIds.clear();
        renderSummary();
      })).observe(b2aSummary,{childList:true,characterData:true,subtree:true});
    }
    renderSummary();
  }

  const api = Object.freeze({
    allowedFields:ALLOWED_FIELDS,
    normalizeFieldValue,
    validatePatch,
    buildMetadataPlan,
    confirmationText
  });

  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V51QuestionBankBulkMetadata',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
