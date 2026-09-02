/* Platform V0.1 — preview-only teacher subject access controls.
   Permission precedence: student override > class setting > platform default. */
(() => {
  'use strict';

  const host = String(location.hostname || '').toLowerCase();
  const isDeployPreview = host.startsWith('deploy-preview-') &&
    host.endsWith('--magical-pixie-a61111.netlify.app');
  if (!isDeployPreview) return;

  const TAB_ID = 'platform-v01-subject-access-tab';
  const PANEL_ID = 'platform-v01-subject-access-panel';
  const STYLE_ID = 'platform-v01-subject-access-style';
  const FEEDBACK_ID = 'platform-v01-subject-feedback';
  let snapshot = null;
  let loading = false;

  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function cloudAvailable(){
    try { return !!cloudReady && !!cloud && !!teacherUser; }
    catch { return false; }
  }

  function injectStyles(){
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} .platform-v01-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:14px 0}
      #${PANEL_ID} .platform-v01-stat{border:1px solid var(--border);border-radius:14px;padding:14px;background:var(--surface-soft,#f8fafc)}
      #${PANEL_ID} .platform-v01-stat strong{display:block;font-size:20px;margin-bottom:4px}
      #${PANEL_ID} .platform-v01-section{border:1px solid var(--border);border-radius:16px;padding:16px;margin-top:16px;background:var(--surface,#fff)}
      #${PANEL_ID} .platform-v01-bulk{display:grid;grid-template-columns:minmax(140px,190px) repeat(4,minmax(120px,1fr));gap:9px;align-items:end;margin-top:12px}
      #${PANEL_ID} .platform-v01-table select{min-width:120px;min-height:40px;padding:7px 9px}
      #${PANEL_ID} .platform-v01-effective{font-size:12px;font-weight:850}
      #${PANEL_ID} .platform-v01-on{color:var(--success)}
      #${PANEL_ID} .platform-v01-off{color:var(--danger)}
      #${PANEL_ID} .platform-v01-source{display:block;color:var(--muted);font-size:10px;font-weight:600;margin-top:2px}
      #${PANEL_ID} .platform-v01-filters{display:grid;grid-template-columns:minmax(180px,250px) minmax(220px,1fr);gap:10px;margin:12px 0}
      #${PANEL_ID} .platform-v01-help{margin:10px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
      #${PANEL_ID} .platform-v01-default-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border:1px solid var(--border);border-radius:999px;font-size:12px;font-weight:800;background:var(--card)}
      @media(max-width:900px){#${PANEL_ID} .platform-v01-bulk{grid-template-columns:1fr 1fr}#${PANEL_ID} .platform-v01-bulk label{grid-column:1/-1}}
      @media(max-width:620px){#${PANEL_ID} .platform-v01-bulk,#${PANEL_ID} .platform-v01-filters{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel(){
    const tabs = document.querySelector('#teacher .tabs');
    const classesTab = document.querySelector('#teacher .tab[data-panel="classes-panel"]');
    const classesPanel = byId('classes-panel');
    if (!tabs || !classesPanel) return;

    if (!byId(TAB_ID)) {
      const tab = document.createElement('button');
      tab.id = TAB_ID;
      tab.type = 'button';
      tab.className = 'tab';
      tab.dataset.panel = PANEL_ID;
      tab.textContent = 'Subject Access';
      classesTab?.insertAdjacentElement('afterend',tab);
      tab.addEventListener('click',() => {
        activatePanel();
        loadOverview();
      });
    }

    if (!byId(PANEL_ID)) {
      const panel = document.createElement('div');
      panel.id = PANEL_ID;
      panel.className = 'panel';
      panel.innerHTML = `
        <div class="header">
          <div>
            <h2>Subject Access</h2>
            <p class="muted">Choose which students can use Mathematics and Science. Individual student overrides take priority over class settings.</p>
          </div>
          <button id="platform-v01-subject-refresh" class="secondary" type="button">Refresh</button>
        </div>
        <div id="${FEEDBACK_ID}" class="feedback hidden" aria-live="polite"></div>
        <div id="platform-v01-defaults"></div>

        <section class="platform-v01-section">
          <h3>Quick year controls</h3>
          <p class="muted">Apply a subject combination to every active class in one year level.</p>
          <div class="platform-v01-bulk">
            <label>Year level
              <select id="platform-v01-year-select">
                <option value="4">Year 4</option><option value="5">Year 5</option><option value="6" selected>Year 6</option>
                <option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option>
              </select>
            </label>
            <button class="outline platform-v01-year-preset" data-preset="maths" type="button">Maths only</button>
            <button class="outline platform-v01-year-preset" data-preset="science" type="button">Science only</button>
            <button class="outline platform-v01-year-preset" data-preset="both" type="button">Both subjects</button>
            <button class="outline platform-v01-year-preset" data-preset="neither" type="button">Neither</button>
          </div>
        </section>

        <section class="platform-v01-section">
          <h3>Class defaults</h3>
          <p class="muted">Set each class to On, Off, or Inherit the platform default.</p>
          <div id="platform-v01-class-root"></div>
        </section>

        <section class="platform-v01-section">
          <h3>Individual student overrides</h3>
          <p class="muted">Use an override only when one student needs different access from their class.</p>
          <div class="platform-v01-filters">
            <select id="platform-v01-student-class-filter"><option value="">All classes</option></select>
            <input id="platform-v01-student-search" type="search" placeholder="Search student name or ID">
          </div>
          <div id="platform-v01-student-root"></div>
        </section>
      `;
      classesPanel.insertAdjacentElement('afterend',panel);

      byId('platform-v01-subject-refresh')?.addEventListener('click',loadOverview);
      panel.querySelectorAll('.platform-v01-year-preset').forEach(button => {
        button.addEventListener('click',() => applyYearPreset(button.dataset.preset));
      });
      byId('platform-v01-student-class-filter')?.addEventListener('change',renderStudents);
      byId('platform-v01-student-search')?.addEventListener('input',renderStudents);
    }
  }

  function activatePanel(){
    document.querySelectorAll('#teacher .tab').forEach(tab => tab.classList.toggle('active',tab.id===TAB_ID));
    document.querySelectorAll('#teacher .panel').forEach(panel => panel.classList.toggle('active',panel.id===PANEL_ID));
  }

  function feedback(kind,message){
    const root = byId(FEEDBACK_ID);
    if (!root) return;
    root.className = `feedback ${kind}`;
    root.textContent = message;
    root.classList.remove('hidden');
  }

  function clearFeedback(){ byId(FEEDBACK_ID)?.classList.add('hidden'); }

  function settingValue(value){
    if (value === true) return 'on';
    if (value === false) return 'off';
    return 'inherit';
  }

  function selectOptions(selected,label='Inherit'){
    return [
      ['inherit',label],['on','On'],['off','Off']
    ].map(([value,text]) => `<option value="${value}"${selected===value?' selected':''}>${text}</option>`).join('');
  }

  function effectiveHtml(allowed,source){
    return `<span class="platform-v01-effective ${allowed?'platform-v01-on':'platform-v01-off'}">${allowed?'ON':'OFF'}</span><span class="platform-v01-source">${esc(String(source||'').replaceAll('_',' '))}</span>`;
  }

  function renderDefaults(){
    const root = byId('platform-v01-defaults');
    if (!root) return;
    const maths = snapshot?.defaults?.maths === true;
    const science = snapshot?.defaults?.science === true;
    root.innerHTML = `
      <div class="platform-v01-summary">
        <div class="platform-v01-stat"><strong>Platform defaults</strong><span class="platform-v01-default-pill">🔢 Maths ${maths?'ON':'OFF'}</span> <span class="platform-v01-default-pill">🔬 Science ${science?'ON':'OFF'}</span></div>
        <div class="platform-v01-stat"><strong>Priority</strong><span>Student override → Class → Platform default</span></div>
      </div>
      <p class="platform-v01-help">Current safe default is Mathematics on and Science off. A class or individual setting can override this.</p>`;
  }

  function populateClassFilter(){
    const select = byId('platform-v01-student-class-filter');
    if (!select) return;
    const previous = select.value;
    const classes = Array.isArray(snapshot?.classes) ? snapshot.classes : [];
    select.innerHTML = '<option value="">All classes</option>' + classes.map(row =>
      `<option value="${esc(row.id)}">${esc(row.name)} · Year ${Number(row.year_level||0)}</option>`
    ).join('');
    if ([...select.options].some(option => option.value===previous)) select.value=previous;
  }

  function renderClasses(){
    const root = byId('platform-v01-class-root');
    if (!root) return;
    const rows = Array.isArray(snapshot?.classes) ? snapshot.classes : [];
    if (!rows.length) {
      root.innerHTML = '<div class="empty">No active classes are available.</div>';
      return;
    }

    root.innerHTML = `<div class="tablewrap"><table class="platform-v01-table"><thead><tr><th>Class</th><th>Mathematics setting</th><th>Effective</th><th>Science setting</th><th>Effective</th></tr></thead><tbody>${rows.map(row => `
      <tr>
        <td><strong>${esc(row.name)}</strong><div class="help">Year ${Number(row.year_level||0)}</div></td>
        <td><select class="platform-v01-class-setting" data-class-id="${esc(row.id)}" data-subject="maths">${selectOptions(settingValue(row.maths_setting))}</select></td>
        <td>${effectiveHtml(row.maths_allowed,row.maths_source)}</td>
        <td><select class="platform-v01-class-setting" data-class-id="${esc(row.id)}" data-subject="science">${selectOptions(settingValue(row.science_setting))}</select></td>
        <td>${effectiveHtml(row.science_allowed,row.science_source)}</td>
      </tr>`).join('')}</tbody></table></div>`;

    root.querySelectorAll('.platform-v01-class-setting').forEach(select => {
      select.addEventListener('change',() => saveClassSetting(select));
    });
  }

  function filteredStudents(){
    const rows = Array.isArray(snapshot?.students) ? snapshot.students : [];
    const classId = byId('platform-v01-student-class-filter')?.value || '';
    const query = String(byId('platform-v01-student-search')?.value || '').trim().toLowerCase();
    return rows.filter(row => {
      if (row.active === false) return false;
      if (classId && String(row.class_id)!==String(classId)) return false;
      if (query && !`${row.student_name||''} ${row.student_id||''}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }

  function renderStudents(){
    const root = byId('platform-v01-student-root');
    if (!root) return;
    const rows = filteredStudents();
    if (!rows.length) {
      root.innerHTML = '<div class="empty">No active students match these filters.</div>';
      return;
    }

    root.innerHTML = `<div class="tablewrap"><table class="platform-v01-table"><thead><tr><th>Student</th><th>Class</th><th>Maths override</th><th>Effective</th><th>Science override</th><th>Effective</th></tr></thead><tbody>${rows.map(row => `
      <tr>
        <td><strong>${esc(row.student_name)}</strong><div class="help">${esc(row.student_id)}</div></td>
        <td>${esc(row.class_name)} · Y${Number(row.year_level||0)}</td>
        <td><select class="platform-v01-student-setting" data-student-id="${esc(row.id)}" data-subject="maths">${selectOptions(settingValue(row.maths_override),'Use class setting')}</select></td>
        <td>${effectiveHtml(row.maths_allowed,row.maths_source)}</td>
        <td><select class="platform-v01-student-setting" data-student-id="${esc(row.id)}" data-subject="science">${selectOptions(settingValue(row.science_override),'Use class setting')}</select></td>
        <td>${effectiveHtml(row.science_allowed,row.science_source)}</td>
      </tr>`).join('')}</tbody></table></div>`;

    root.querySelectorAll('.platform-v01-student-setting').forEach(select => {
      select.addEventListener('change',() => saveStudentSetting(select));
    });
  }

  function renderAll(){
    renderDefaults();
    populateClassFilter();
    renderClasses();
    renderStudents();
  }

  async function loadOverview(){
    if (loading) return;
    clearFeedback();
    if (!cloudAvailable()) {
      snapshot = null;
      renderAll();
      feedback('try','Sign in as a teacher to manage subject access.');
      return;
    }

    loading = true;
    const button = byId('platform-v01-subject-refresh');
    if (button) { button.disabled=true; button.textContent='Refreshing…'; }
    try {
      const { data, error } = await cloud.rpc('teacher_subject_access_overview');
      if (error) throw error;
      snapshot = data || { defaults:{},classes:[],students:[] };
      renderAll();
    } catch (error) {
      console.warn('Could not load subject access.',error);
      feedback('incorrect',`Subject access could not be loaded. ${error?.message||''}`.trim());
    } finally {
      loading=false;
      if (button) { button.disabled=false; button.textContent='Refresh'; }
    }
  }

  function decodeSetting(value){
    if (value==='on') return true;
    if (value==='off') return false;
    return null;
  }

  async function saveClassSetting(select){
    const original = select.disabled;
    select.disabled = true;
    clearFeedback();
    try {
      const { error } = await cloud.rpc('teacher_set_class_subject_access', {
        p_class_id: select.dataset.classId,
        p_subject: select.dataset.subject,
        p_enabled: decodeSetting(select.value)
      });
      if (error) throw error;
      feedback('correct','Class subject access updated.');
      await loadOverview();
    } catch (error) {
      feedback('incorrect',`Class access could not be updated. ${error?.message||''}`.trim());
      await loadOverview();
    } finally {
      select.disabled = original;
    }
  }

  async function saveStudentSetting(select){
    select.disabled = true;
    clearFeedback();
    try {
      const { error } = await cloud.rpc('teacher_set_student_subject_access_override', {
        p_roster_student_id: select.dataset.studentId,
        p_subject: select.dataset.subject,
        p_enabled: decodeSetting(select.value)
      });
      if (error) throw error;
      feedback('correct','Student subject override updated.');
      await loadOverview();
    } catch (error) {
      feedback('incorrect',`Student access could not be updated. ${error?.message||''}`.trim());
      await loadOverview();
    } finally {
      select.disabled = false;
    }
  }

  async function applyYearPreset(preset){
    const year = Number(byId('platform-v01-year-select')?.value || 0);
    if (!year) return;
    const map = {
      maths:{maths:true,science:false},
      science:{maths:false,science:true},
      both:{maths:true,science:true},
      neither:{maths:false,science:false}
    };
    const values = map[preset];
    if (!values) return;

    const label = preset==='maths'?'Maths only':preset==='science'?'Science only':preset==='both'?'both subjects':'neither subject';
    if (!confirm(`Set every active Year ${year} class to ${label}? Individual student overrides will remain unchanged.`)) return;

    clearFeedback();
    try {
      for (const subject of ['maths','science']) {
        const { error } = await cloud.rpc('teacher_set_year_subject_access', {
          p_year_level: year,
          p_subject: subject,
          p_enabled: values[subject]
        });
        if (error) throw error;
      }
      feedback('correct',`Year ${year} subject access updated to ${label}.`);
      await loadOverview();
    } catch (error) {
      feedback('incorrect',`Year access could not be updated. ${error?.message||''}`.trim());
      await loadOverview();
    }
  }

  function apply(){
    injectStyles();
    ensurePanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',apply,{once:true});
  } else {
    apply();
  }
})();
