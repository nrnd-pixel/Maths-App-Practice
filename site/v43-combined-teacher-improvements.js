/* V4.3D — Combined Teacher Improvements.
   Teacher-side workflow polish only. Adds Exam Settings filters, multi-paper
   selection, bulk editing and batched saving while preserving the existing
   exam_paper_settings schema and single-card save path. */
(() => {
  'use strict';

  const STYLE_ID = 'v43d-combined-teacher-improvements-style';
  const TOOLS_ID = 'v43d-exam-tools';
  const selectedKeys = new Set();
  let decorateQueued = false;

  function html(value){
    return String(value ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${TOOLS_ID}{
        border:1px solid var(--border);
        border-radius:16px;
        padding:15px;
        margin:15px 0;
        background:var(--card);
        color:var(--text);
      }
      #${TOOLS_ID} .v43d-head{
        display:flex;
        justify-content:space-between;
        gap:12px;
        align-items:flex-start;
        flex-wrap:wrap;
      }
      #${TOOLS_ID} .v43d-head h3{margin:0 0 4px}
      #${TOOLS_ID} .v43d-filter-grid{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:10px;
        margin-top:13px;
      }
      #${TOOLS_ID} .v43d-select-row,
      #${TOOLS_ID} .v43d-actions{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        align-items:center;
        margin-top:11px;
      }
      #${TOOLS_ID} .v43d-summary{
        margin-left:auto;
        font-size:12px;
        color:var(--muted);
        font-weight:700;
      }
      #${TOOLS_ID} .v43d-bulk{
        margin-top:13px;
        padding-top:13px;
        border-top:1px solid var(--border);
      }
      #${TOOLS_ID} .v43d-bulk-grid{
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:10px;
      }
      #${TOOLS_ID} .v43d-custom-duration.hidden{display:none!important}
      #${TOOLS_ID} .v43d-feedback{margin-top:10px}
      #exam-settings-list .settings-card.v43d-filtered{display:none!important}
      #exam-settings-list .settings-card.v43d-selected{
        outline:2px solid color-mix(in srgb,var(--primary) 70%,transparent);
        outline-offset:1px;
      }
      #exam-settings-list .v43d-card-select-label{
        display:inline-flex;
        align-items:center;
        gap:6px;
        font-size:11px;
        font-weight:800;
        color:var(--muted);
        white-space:nowrap;
      }
      #exam-settings-list .v43d-card-select{
        width:auto;
        min-height:auto;
        margin:0;
        accent-color:var(--primary);
      }
      @media(max-width:850px){
        #${TOOLS_ID} .v43d-bulk-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media(max-width:700px){
        #${TOOLS_ID}{padding:13px}
        #${TOOLS_ID} .v43d-filter-grid,
        #${TOOLS_ID} .v43d-bulk-grid{grid-template-columns:1fr}
        #${TOOLS_ID} .v43d-summary{width:100%;margin-left:0}
        #${TOOLS_ID} .v43d-actions button{flex:1 1 140px}
      }
    `;
    document.head.appendChild(style);
  }

  function cardKey(card){
    return [card?.dataset?.year,card?.dataset?.examYear,card?.dataset?.paper]
      .map(value => String(value || '').trim())
      .join('|');
  }

  function cards(){
    return [...document.querySelectorAll('#exam-settings-list .settings-card')];
  }

  function feedback(kind,message){
    const root = document.getElementById('v43d-feedback');
    if (!root) return;
    root.className = `feedback ${kind} v43d-feedback`;
    root.textContent = message;
    root.classList.remove('hidden');
  }

  function ensureTools(){
    const panel = document.getElementById('exam-settings-panel');
    const list = document.getElementById('exam-settings-list');
    if (!panel || !list) return null;
    let root = document.getElementById(TOOLS_ID);
    if (root) return root;

    root = document.createElement('section');
    root.id = TOOLS_ID;
    root.innerHTML = `
      <div class="v43d-head">
        <div>
          <h3>Manage papers faster</h3>
          <div class="help">Filter the paper list, select several papers, then apply and save shared settings in one action.</div>
        </div>
        <span class="tag">V4.3D</span>
      </div>
      <div class="v43d-filter-grid">
        <label>Exam year<select id="v43d-filter-year"><option value="">All years</option></select></label>
        <label>Paper<select id="v43d-filter-paper"><option value="">All papers</option></select></label>
        <label>Availability<select id="v43d-filter-availability"><option value="">All</option><option value="true">Available</option><option value="false">Unavailable</option></select></label>
      </div>
      <div class="v43d-select-row">
        <button id="v43d-select-visible" class="secondary" type="button">Select visible</button>
        <button id="v43d-clear-selection" class="outline" type="button">Clear selection</button>
        <span id="v43d-summary" class="v43d-summary">0 papers loaded</span>
      </div>
      <div class="v43d-bulk">
        <div class="help" style="margin-bottom:9px"><strong>Bulk changes:</strong> fields set to “Leave unchanged” keep each paper's current value.</div>
        <div class="v43d-bulk-grid">
          <label>Duration
            <select id="v43d-duration-mode">
              <option value="unchanged">Leave unchanged</option>
              <option value="none">No timer</option>
              <option value="custom">Set minutes…</option>
            </select>
          </label>
          <label id="v43d-custom-duration-wrap" class="v43d-custom-duration hidden">Minutes
            <input id="v43d-custom-duration" type="number" min="1" max="600" placeholder="e.g. 60">
          </label>
          <label>Answer release
            <select id="v43d-release">
              <option value="">Leave unchanged</option>
              <option value="immediate">Immediately after submission</option>
              <option value="after_manual_review">After all manual reviews</option>
              <option value="never">Do not release answers</option>
            </select>
          </label>
          <label>Paper availability
            <select id="v43d-availability">
              <option value="">Leave unchanged</option>
              <option value="true">Available in Exam Mode</option>
              <option value="false">Unavailable</option>
            </select>
          </label>
        </div>
        <div class="v43d-actions">
          <button id="v43d-apply-selected" class="secondary" type="button">Apply to selected</button>
          <button id="v43d-save-selected" class="primary" type="button">Save selected</button>
        </div>
        <div id="v43d-feedback" class="feedback hidden v43d-feedback"></div>
      </div>`;

    list.insertAdjacentElement('beforebegin',root);

    root.querySelector('#v43d-filter-year').addEventListener('change',applyFilters);
    root.querySelector('#v43d-filter-paper').addEventListener('change',applyFilters);
    root.querySelector('#v43d-filter-availability').addEventListener('change',applyFilters);
    root.querySelector('#v43d-select-visible').addEventListener('click',selectVisible);
    root.querySelector('#v43d-clear-selection').addEventListener('click',clearSelection);
    root.querySelector('#v43d-duration-mode').addEventListener('change',updateDurationMode);
    root.querySelector('#v43d-apply-selected').addEventListener('click',applyBulkChanges);
    root.querySelector('#v43d-save-selected').addEventListener('click',saveSelected);
    return root;
  }

  function updateDurationMode(){
    const mode = document.getElementById('v43d-duration-mode')?.value || 'unchanged';
    document.getElementById('v43d-custom-duration-wrap')?.classList.toggle('hidden',mode !== 'custom');
  }

  function rebuildFilterOptions(){
    const yearSelect = document.getElementById('v43d-filter-year');
    const paperSelect = document.getElementById('v43d-filter-paper');
    if (!yearSelect || !paperSelect) return;

    const previousYear = yearSelect.value;
    const previousPaper = paperSelect.value;
    const years = [...new Set(cards().map(card => String(card.dataset.examYear || '').trim()).filter(Boolean))]
      .sort((a,b) => Number(b)-Number(a));
    const papers = [...new Set(cards().map(card => String(card.dataset.paper || '').trim()).filter(Boolean))]
      .sort((a,b) => a.localeCompare(b,undefined,{numeric:true}));

    yearSelect.innerHTML = '<option value="">All years</option>' + years.map(value => `<option value="${html(value)}">${html(value)}</option>`).join('');
    paperSelect.innerHTML = '<option value="">All papers</option>' + papers.map(value => `<option value="${html(value)}">${html(value)}</option>`).join('');
    if (years.includes(previousYear)) yearSelect.value = previousYear;
    if (papers.includes(previousPaper)) paperSelect.value = previousPaper;
  }

  function cardMatchesFilters(card){
    const year = document.getElementById('v43d-filter-year')?.value || '';
    const paper = document.getElementById('v43d-filter-paper')?.value || '';
    const availability = document.getElementById('v43d-filter-availability')?.value || '';
    if (year && String(card.dataset.examYear || '') !== year) return false;
    if (paper && String(card.dataset.paper || '') !== paper) return false;
    if (availability){
      const current = card.querySelector('.setting-available')?.value || 'true';
      if (current !== availability) return false;
    }
    return true;
  }

  function applyFilters(){
    cards().forEach(card => card.classList.toggle('v43d-filtered',!cardMatchesFilters(card)));
    updateSummary();
  }

  function decorateCard(card){
    if (!card || card.dataset.v43dDecorated === '1') return;
    card.dataset.v43dDecorated = '1';
    const key = cardKey(card);
    const head = card.querySelector('.settings-card-head');
    if (!head || !key) return;

    const label = document.createElement('label');
    label.className = 'v43d-card-select-label';
    label.innerHTML = '<input class="v43d-card-select" type="checkbox"> Select';
    const checkbox = label.querySelector('input');
    checkbox.checked = selectedKeys.has(key);
    card.classList.toggle('v43d-selected',checkbox.checked);
    checkbox.addEventListener('change',() => {
      if (checkbox.checked) selectedKeys.add(key);
      else selectedKeys.delete(key);
      card.classList.toggle('v43d-selected',checkbox.checked);
      updateSummary();
    });

    const actions = head.querySelector('.v43c-head-actions');
    if (actions) actions.prepend(label);
    else head.appendChild(label);
  }

  function decorateCards(){
    ensureTools();
    cards().forEach(decorateCard);
    rebuildFilterOptions();
    applyFilters();
  }

  function scheduleDecorate(){
    if (decorateQueued) return;
    decorateQueued = true;
    setTimeout(() => {
      decorateQueued = false;
      decorateCards();
    },0);
  }

  function updateSummary(){
    const all = cards();
    const visible = all.filter(card => !card.classList.contains('v43d-filtered'));
    const selected = all.filter(card => selectedKeys.has(cardKey(card))).length;
    const dirty = all.filter(card => card.classList.contains('v43c-dirty')).length;
    const root = document.getElementById('v43d-summary');
    if (root){
      root.textContent = `${visible.length} of ${all.length} shown · ${selected} selected${dirty ? ` · ${dirty} unsaved` : ''}`;
    }
  }

  function selectVisible(){
    cards().filter(card => !card.classList.contains('v43d-filtered')).forEach(card => {
      const key = cardKey(card);
      if (!key) return;
      selectedKeys.add(key);
      card.classList.add('v43d-selected');
      const checkbox = card.querySelector('.v43d-card-select');
      if (checkbox) checkbox.checked = true;
    });
    updateSummary();
  }

  function clearSelection(){
    selectedKeys.clear();
    cards().forEach(card => {
      card.classList.remove('v43d-selected');
      const checkbox = card.querySelector('.v43d-card-select');
      if (checkbox) checkbox.checked = false;
    });
    updateSummary();
  }

  function selectedCards(){
    return cards().filter(card => selectedKeys.has(cardKey(card)));
  }

  function changeControl(control,value,eventName='change'){
    if (!control || control.value === value) return false;
    control.value = value;
    control.dispatchEvent(new Event(eventName,{bubbles:true}));
    return true;
  }

  function applyBulkChanges(){
    const targets = selectedCards();
    if (!targets.length){ feedback('try','Select at least one paper first.'); return; }

    const durationMode = document.getElementById('v43d-duration-mode')?.value || 'unchanged';
    const durationRaw = document.getElementById('v43d-custom-duration')?.value || '';
    const release = document.getElementById('v43d-release')?.value || '';
    const availability = document.getElementById('v43d-availability')?.value || '';
    let duration = null;

    if (durationMode === 'custom'){
      duration = Number(durationRaw);
      if (!Number.isFinite(duration) || duration < 1 || duration > 600){
        feedback('try','Enter a duration between 1 and 600 minutes.');
        return;
      }
    }
    if (durationMode === 'unchanged' && !release && !availability){
      feedback('try','Choose at least one bulk setting to change.');
      return;
    }

    let changed = 0;
    targets.forEach(card => {
      if (durationMode === 'none') changed += changeControl(card.querySelector('.setting-duration'),'','input') ? 1 : 0;
      if (durationMode === 'custom') changed += changeControl(card.querySelector('.setting-duration'),String(duration),'input') ? 1 : 0;
      if (release) changed += changeControl(card.querySelector('.setting-release'),release) ? 1 : 0;
      if (availability) changed += changeControl(card.querySelector('.setting-available'),availability) ? 1 : 0;
    });

    applyFilters();
    updateSummary();
    feedback('correct',changed
      ? `Applied the selected settings to ${targets.length} paper${targets.length===1?'':'s'}. Review the cards, then choose Save selected.`
      : 'Those papers already use the selected values.');
  }

  function payloadFor(card){
    const durationRaw = card.querySelector('.setting-duration')?.value?.trim() || '';
    const duration = durationRaw ? Number(durationRaw) : null;
    if (duration !== null && (!Number.isFinite(duration) || duration < 1 || duration > 600)){
      throw new Error(`${card.dataset.examYear} · ${card.dataset.paper}: duration must be between 1 and 600 minutes.`);
    }
    return {
      year_level:Number(card.dataset.year),
      exam_year:Number(card.dataset.examYear),
      paper:String(card.dataset.paper || '').trim(),
      duration_minutes:duration,
      answer_release_rule:card.querySelector('.setting-release')?.value || 'immediate',
      is_available:(card.querySelector('.setting-available')?.value || 'true') === 'true'
    };
  }

  async function saveSelected(){
    const targets = selectedCards();
    if (!targets.length){ feedback('try','Select at least one paper first.'); return; }
    if (typeof cloud === 'undefined' || !cloud || typeof cloudReady === 'undefined' || !cloudReady || typeof teacherUser === 'undefined' || !teacherUser){
      feedback('incorrect','Teacher cloud access is not ready.');
      return;
    }

    let payloads;
    try {
      payloads = targets.map(payloadFor);
    } catch (error){
      feedback('try',error?.message || String(error));
      return;
    }

    const button = document.getElementById('v43d-save-selected');
    const applyButton = document.getElementById('v43d-apply-selected');
    if (!button) return;
    button.disabled = true;
    if (applyButton) applyButton.disabled = true;
    const previous = button.textContent;
    button.textContent = `Saving ${payloads.length}…`;

    try {
      const {error} = await cloud.from('exam_paper_settings').upsert(payloads,{onConflict:'year_level,exam_year,paper'});
      if (error) throw error;
      const count = payloads.length;
      selectedKeys.clear();
      feedback('correct',`Saved settings for ${count} paper${count===1?'':'s'}.`);
      if (typeof loadExamSettingsEditor === 'function') await loadExamSettingsEditor();
      if (typeof loadExamOptions === 'function') await loadExamOptions();
      scheduleDecorate();
    } catch (error){
      feedback('incorrect',`Could not save selected papers. ${error?.message || String(error)}`.trim());
    } finally {
      button.disabled = false;
      if (applyButton) applyButton.disabled = false;
      button.textContent = previous;
    }
  }

  function wireList(){
    const list = document.getElementById('exam-settings-list');
    if (!list || list.dataset.v43dWired === '1') return;
    list.dataset.v43dWired = '1';
    const observer = new MutationObserver(scheduleDecorate);
    observer.observe(list,{childList:true});
    list.addEventListener('input',() => setTimeout(updateSummary,0));
    list.addEventListener('change',event => {
      if (event.target.matches('.setting-available')) applyFilters();
      setTimeout(updateSummary,0);
    });
  }

  function wire(){
    injectStyles();
    ensureTools();
    wireList();
    updateDurationMode();
    scheduleDecorate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
