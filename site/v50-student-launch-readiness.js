/* V5.0D1 — Student Launch Readiness.
   Teacher-only pre-launch checks, guarded clean-start reset and one-time bulk PIN sheet.
   Permanent roster/content/config/report data is preserved by default. */
(() => {
  'use strict';

  if (window.__v50StudentLaunchReadinessInstalled) return;
  window.__v50StudentLaunchReadinessInstalled = true;

  const TAB_ID = 'v50d1-launch-readiness-tab';
  const PANEL_ID = 'launch-readiness-panel';
  const BADGE_ID = 'v50d1-launch-readiness-badge';
  const FEEDBACK_ID = 'v50d1-launch-feedback';
  const STYLE_ID = 'v50d1-launch-style';
  const CONFIRM_PHRASE = 'RESET STUDENT ACTIVITY';
  let readiness = null;
  let generatedPins = [];
  let loading = false;

  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;

  function cloudAvailable(){
    try { return !!cloudReady && !!cloud && !!teacherUser; }
    catch { return false; }
  }

  function formatDate(value){
    if (!value) return 'Not yet';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not yet';
    return date.toLocaleString(undefined,{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});
  }

  function localDateStamp(date = new Date()){
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function injectStyles(){
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} .v50d1-hero{border:1px solid var(--border);border-radius:16px;padding:18px;margin:14px 0;background:var(--surface-soft)}
      #${PANEL_ID} .v50d1-hero.ready{border-color:var(--success);background:var(--secure-card)}
      #${PANEL_ID} .v50d1-hero.blocked{border-color:var(--warn);background:var(--develop-card)}
      #${PANEL_ID} .v50d1-hero h3{margin:0 0 5px}
      #${PANEL_ID} .v50d1-checks{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin:14px 0}
      #${PANEL_ID} .v50d1-check{border:1px solid var(--border);border-radius:13px;padding:12px;background:var(--surface)}
      #${PANEL_ID} .v50d1-check.pass{border-color:var(--success)}
      #${PANEL_ID} .v50d1-check.warn{border-color:var(--warn)}
      #${PANEL_ID} .v50d1-check.fail{border-color:var(--danger)}
      #${PANEL_ID} .v50d1-check strong{display:block;margin-bottom:5px}
      #${PANEL_ID} .v50d1-section{margin-top:18px;border:1px solid var(--border);border-radius:14px;padding:16px;background:var(--surface)}
      #${PANEL_ID} .v50d1-counts{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin-top:12px}
      #${PANEL_ID} .v50d1-count{padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--surface-soft)}
      #${PANEL_ID} .v50d1-count strong{display:block;font-size:19px}
      #${PANEL_ID} .v50d1-danger{border-color:var(--danger);background:var(--attention-card)}
      #${PANEL_ID} .v50d1-confirm{max-width:430px}
      #${PANEL_ID} .v50d1-pin-table td:last-child,#${PANEL_ID} .v50d1-pin-table th:last-child{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:850;letter-spacing:.08em}
      #${PANEL_ID} .v50d1-preserve{margin-top:10px}
      #${PANEL_ID} .v50d1-test-list{margin-top:10px}
      #${PANEL_ID} .v50d1-test-item{padding:8px 10px;border:1px solid var(--warn);border-radius:9px;margin-top:6px;background:var(--develop-card)}
      @media(max-width:700px){#${PANEL_ID} .v50d1-checks{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel(){
    const tabs = document.querySelector('#teacher .tabs');
    const archiveTab = byId('v50c3b-report-archive-tab');
    const analyticsTab = tabs?.querySelector('[data-panel="analytics-panel"]');
    const archivePanel = byId('report-archive-panel');
    const analyticsPanel = byId('analytics-panel');
    if (!tabs || !analyticsPanel) return;

    let tab = byId(TAB_ID);
    if (!tab){
      tab = document.createElement('button');
      tab.id = TAB_ID;
      tab.type = 'button';
      tab.className = 'tab';
      tab.dataset.panel = PANEL_ID;
      tab.innerHTML = `Launch Readiness <span id="${BADGE_ID}" class="tag">?</span>`;
      (archiveTab || analyticsTab)?.insertAdjacentElement('afterend',tab);
    }

    if (!byId(PANEL_ID)){
      const panel = document.createElement('div');
      panel.id = PANEL_ID;
      panel.className = 'panel';
      panel.innerHTML = `
        <div class="header">
          <div><h2>Student Launch Readiness</h2><p class="muted">Prepare a clean, protected student launch without touching your permanent teaching content.</p></div>
          <button id="v50d1-refresh" class="secondary" type="button">Refresh Readiness</button>
        </div>
        <div id="${FEEDBACK_ID}" class="feedback hidden" aria-live="polite"></div>
        <div id="v50d1-readiness-root"><div class="empty">Open this area to check launch readiness.</div></div>
        <section class="v50d1-section">
          <h3>🔐 Bulk PIN preparation</h3>
          <p class="muted">Generate PINs only for active students who do not already have one. Plain PINs are shown once in this browser response; Supabase stores only bcrypt hashes.</p>
          <div class="buttons">
            <label>PIN length <select id="v50d1-pin-digits"><option value="4" selected>4 digits</option><option value="5">5 digits</option><option value="6">6 digits</option></select></label>
            <button id="v50d1-generate-pins" class="secondary" type="button">Generate Missing PINs</button>
            <button id="v50d1-download-pins" class="outline hidden" type="button">Download PIN CSV</button>
            <button id="v50d1-hide-pins" class="outline hidden" type="button">Hide PIN List</button>
          </div>
          <div id="v50d1-pin-result"></div>
        </section>
        <section class="v50d1-section v50d1-danger">
          <h3>⚠️ Clean-start student activity reset</h3>
          <p>This tool is intended for <strong>pre-launch or deliberate year/term rollover only</strong>. It permanently clears student learning/activity history so Analytics starts clean.</p>
          <div class="info v50d1-preserve"><strong>Preserved by default:</strong> classes, roster names/Student IDs, existing PINs, question bank, teacher account, Student Access setting, Exam paper settings and Report Archive.</div>
          <label style="display:block;margin-top:12px"><input id="v50d1-clear-assignments" type="checkbox"> Also clear Practice and Exam assignment definitions</label>
          <label style="display:block;margin-top:8px"><input id="v50d1-clear-pins" type="checkbox"> Also clear all active student PINs</label>
          <label class="v50d1-confirm" style="display:block;margin-top:14px">Type <strong>${CONFIRM_PHRASE}</strong> to enable reset<input id="v50d1-reset-confirm" autocomplete="off" placeholder="${CONFIRM_PHRASE}"></label>
          <div class="buttons"><button id="v50d1-reset" class="danger" type="button" disabled>Reset Student Activity</button></div>
          <div class="help">The reset runs as one database transaction. If any delete fails, the whole reset rolls back.</div>
        </section>
      `;
      (archivePanel || analyticsPanel).insertAdjacentElement('afterend',panel);
    }
  }

  function feedback(kind,message){
    const root = byId(FEEDBACK_ID);
    if (!root) return;
    root.className = `feedback ${kind}`;
    root.textContent = message;
    root.classList.remove('hidden');
  }

  function clearFeedback(){ byId(FEEDBACK_ID)?.classList.add('hidden'); }

  function effectiveReady(data){
    return !!data
      && num(data.active_classes)>0
      && num(data.active_students)>0
      && num(data.pin_missing)===0
      && num(data.duplicate_student_ids)===0
      && data.access_mode==='student_pin'
      && num(data.active_questions)>0
      && num(data.active_exam_papers)>0
      && num(data.available_exam_settings)>0
      && num(data.history_total)===0
      && num(data.possible_test_students_count)===0;
  }

  function check(label,pass,detail,warning=false){
    const state = pass ? 'pass' : (warning ? 'warn' : 'fail');
    const icon = pass ? '✅' : (warning ? '⚠️' : '❌');
    return `<article class="v50d1-check ${state}"><strong>${icon} ${esc(label)}</strong><div>${esc(detail)}</div></article>`;
  }

  function historyCounts(data){
    const history = data?.history || {};
    return [
      ['Practice sessions',history.practice_sessions],
      ['Saved answers',history.session_answers],
      ['Exam attempts',history.exam_attempts],
      ['Student access tickets',history.access_tickets],
      ['Access failures',history.access_failures],
      ['Practice answer events',history.practice_answer_events],
      ['Learning activity days',history.learning_activity_days],
      ['Teacher messages',history.teacher_messages],
      ['AI help interactions',history.ai_help_interactions],
      ['Assignment attempt records',history.practice_assignment_attempts]
    ];
  }

  function renderReadiness(){
    const root = byId('v50d1-readiness-root');
    if (!root) return;
    if (!readiness){
      root.innerHTML = '<div class="empty">Readiness data is unavailable.</div>';
      return;
    }

    const ready = effectiveReady(readiness);
    const badge = byId(BADGE_ID);
    if (badge){ badge.textContent = ready ? '✓' : '!'; badge.title = ready ? 'Ready for controlled launch' : 'Preparation needed'; }
    const possible = Array.isArray(readiness.possible_test_students) ? readiness.possible_test_students : [];
    const testHtml = possible.length ? `
      <div class="v50d1-test-list"><strong>Possible test/demo roster records</strong>${possible.map(row=>`
        <div class="v50d1-test-item">${esc(row.class_name||'')} · ${esc(row.student_name||'Student')} · ${esc(row.student_id||'')}</div>
      `).join('')}</div>` : '';

    root.innerHTML = `
      <section class="v50d1-hero ${ready?'ready':'blocked'}">
        <h3>${ready?'✅ Ready for controlled student launch':'⚠️ Preparation needed before student launch'}</h3>
        <div>${ready
          ? 'Roster, PIN protection, content and clean-start checks currently pass.'
          : 'Resolve the highlighted launch checks below before distributing student access.'}</div>
        <div class="help" style="margin-top:7px">Last clean-start reset: ${esc(formatDate(readiness.last_reset_at))} · Readiness checked ${esc(formatDate(readiness.generated_at))}</div>
      </section>
      <div class="v50d1-checks">
        ${check('Roster',num(readiness.active_students)>0 && num(readiness.active_classes)>0,`${num(readiness.active_students)} active students in ${num(readiness.active_classes)} active classes`)}
        ${check('Student IDs',num(readiness.duplicate_student_ids)===0,num(readiness.duplicate_student_ids)===0?'No duplicate active Student IDs':`${num(readiness.duplicate_student_ids)} duplicate Student ID group(s)`)}
        ${check('Student PINs',num(readiness.pin_missing)===0,`${num(readiness.pin_ready)}/${num(readiness.active_students)} students have PINs`)}
        ${check('Protected access',readiness.access_mode==='student_pin',readiness.access_mode==='student_pin'?'Student ID + PIN mode is active':`Current access mode: ${readiness.access_mode||'unknown'}`)}
        ${check('Question bank',num(readiness.active_questions)>0,`${num(readiness.active_questions)} active questions`)}
        ${check('Exam content',num(readiness.active_exam_papers)>0 && num(readiness.available_exam_settings)>0,`${num(readiness.active_exam_papers)} active paper(s) · ${num(readiness.available_exam_settings)} available paper setting(s)`)}
        ${check('Clean student history',num(readiness.history_total)===0,num(readiness.history_total)===0?'No stored student-history rows':`${num(readiness.history_total)} stored student-history rows`)}
        ${check('Test/demo roster',num(readiness.possible_test_students_count)===0,num(readiness.possible_test_students_count)===0?'No obvious test/demo roster records':`${num(readiness.possible_test_students_count)} possible test/demo roster record(s)`,true)}
      </div>
      ${testHtml}
      <section class="v50d1-section">
        <h3>Current clean-start data</h3>
        <div class="v50d1-counts">${historyCounts(readiness).map(([label,value])=>`<div class="v50d1-count"><strong>${num(value)}</strong><span>${esc(label)}</span></div>`).join('')}</div>
        <div class="help" style="margin-top:10px">Active assignment definitions are not counted as student history: ${num(readiness.active_practice_assignments)} Practice · ${num(readiness.active_exam_assignments)} Exam. Report Archive contains ${num(readiness.report_archives)} saved report(s) and is preserved by the reset.</div>
      </section>
    `;

    const pinButton = byId('v50d1-generate-pins');
    if (pinButton){
      pinButton.disabled = num(readiness.pin_missing)===0;
      pinButton.textContent = num(readiness.pin_missing)>0 ? `Generate ${num(readiness.pin_missing)} Missing PIN${num(readiness.pin_missing)===1?'':'s'}` : 'All PINs Ready ✓';
    }
  }

  async function loadReadiness(){
    if (loading) return;
    clearFeedback();
    if (!cloudAvailable()){
      readiness = null;
      renderReadiness();
      feedback('try','Sign in as a teacher with cloud access to check launch readiness.');
      return;
    }
    loading = true;
    const refresh = byId('v50d1-refresh');
    if (refresh){ refresh.disabled = true; refresh.textContent = 'Checking…'; }
    try {
      const {data,error} = await cloud.rpc('get_teacher_launch_readiness_v50d1');
      if (error) throw error;
      readiness = data || null;
      renderReadiness();
    } catch (error){
      console.warn('Could not load launch readiness.',error);
      readiness = null;
      renderReadiness();
      feedback('incorrect',`Launch readiness could not be checked. ${error?.message||''}`.trim());
    } finally {
      loading = false;
      if (refresh){ refresh.disabled = false; refresh.textContent = 'Refresh Readiness'; }
    }
  }

  function renderPins(){
    const root = byId('v50d1-pin-result');
    const download = byId('v50d1-download-pins');
    const hide = byId('v50d1-hide-pins');
    if (!root) return;
    if (!generatedPins.length){
      root.innerHTML = '';
      download?.classList.add('hidden');
      hide?.classList.add('hidden');
      return;
    }
    root.innerHTML = `
      <div class="info" style="margin-top:12px"><strong>Save this list now.</strong> These plain PINs are held only in this page's memory and cannot be recovered from the stored bcrypt hashes later.</div>
      <div class="tablewrap" style="margin-top:10px"><table class="v50d1-pin-table"><thead><tr><th>Class</th><th>Student</th><th>Student ID</th><th>PIN</th></tr></thead><tbody>${generatedPins.map(row=>`<tr><td>${esc(row.class_name)}</td><td>${esc(row.student_name)}</td><td>${esc(row.student_id)}</td><td>${esc(row.pin)}</td></tr>`).join('')}</tbody></table></div>
    `;
    download?.classList.remove('hidden');
    hide?.classList.remove('hidden');
  }

  async function generatePins(){
    if (!cloudAvailable()) return;
    const missing = num(readiness?.pin_missing);
    if (!missing) return;
    const digits = Number(byId('v50d1-pin-digits')?.value || 4);
    if (!confirm(`Generate ${digits}-digit PINs for ${missing} active student${missing===1?'':'s'} who currently have no PIN? Existing PINs will not be changed.`)) return;
    const button = byId('v50d1-generate-pins');
    if (button){ button.disabled = true; button.textContent = 'Generating…'; }
    try {
      const {data,error} = await cloud.rpc('generate_missing_student_pins_v50d1',{p_digits:digits});
      if (error) throw error;
      generatedPins = Array.isArray(data?.pins) ? data.pins : [];
      renderPins();
      feedback('correct',`${num(data?.generated_count)} student PIN${num(data?.generated_count)===1?'':'s'} generated. Download the PIN CSV before leaving this page.`);
      await loadReadiness();
      try { if (typeof loadTeacher==='function') await loadTeacher(); } catch {}
    } catch (error){
      console.warn('Could not generate student PINs.',error);
      feedback('incorrect',`Student PINs could not be generated. ${error?.message||''}`.trim());
      if (button) button.disabled = false;
    }
  }

  function downloadPins(){
    if (!generatedPins.length) return;
    const api = window.V50ReportingExport;
    if (!api?.downloadSnapshot){
      feedback('incorrect','CSV export support is not available on this page.');
      return;
    }
    const headers = ['class_name','student_id','student_name','pin'];
    const records = generatedPins.map(row=>({
      class_name:row.class_name||'',student_id:row.student_id||'',student_name:row.student_name||'',pin:String(row.pin||'')
    }));
    api.downloadSnapshot({filename:`Student PINs - ${localDateStamp()}.csv`,headers,records});
  }

  function updateResetButton(){
    const input = byId('v50d1-reset-confirm');
    const button = byId('v50d1-reset');
    if (button) button.disabled = String(input?.value||'') !== CONFIRM_PHRASE;
  }

  async function resetActivity(){
    if (!cloudAvailable()) return;
    const input = byId('v50d1-reset-confirm');
    if (String(input?.value||'') !== CONFIRM_PHRASE) return;
    const clearAssignments = !!byId('v50d1-clear-assignments')?.checked;
    const clearPins = !!byId('v50d1-clear-pins')?.checked;
    const summary = [
      'This permanently clears student Practice/Exam history, saved answers, access tickets, engagement aggregates and assignment attempt history.',
      clearAssignments ? 'Practice and Exam assignment definitions WILL also be deleted.' : 'Practice and Exam assignment definitions will be preserved.',
      clearPins ? 'All active student PINs WILL also be cleared.' : 'Existing student PINs will be preserved.',
      'Classes, roster identities, questions, teacher settings, Exam paper settings and Report Archive are preserved.'
    ].join('\n\n');
    if (!confirm(`${summary}\n\nProceed with the transactional reset?`)) return;

    const button = byId('v50d1-reset');
    if (button){ button.disabled = true; button.textContent = 'Resetting…'; }
    try {
      const {data,error} = await cloud.rpc('reset_student_launch_activity_v50d1',{
        p_confirm_text:CONFIRM_PHRASE,
        p_clear_assignments:clearAssignments,
        p_clear_pins:clearPins
      });
      if (error) throw error;
      generatedPins = [];
      renderPins();
      if (input) input.value = '';
      byId('v50d1-clear-assignments').checked = false;
      byId('v50d1-clear-pins').checked = false;
      feedback('correct',`Student activity reset complete. ${num(data?.deleted?.practice_sessions)} Practice/Exam session record(s), ${num(data?.deleted?.session_answers)} answer record(s) and ${num(data?.deleted?.exam_attempts)} Exam attempt record(s) were cleared. Permanent roster/content/configuration was preserved.`);
      await loadReadiness();
      try { if (typeof loadTeacher==='function') await loadTeacher(); } catch {}
    } catch (error){
      console.warn('Could not reset student launch activity.',error);
      feedback('incorrect',`Student activity reset failed. No partial reset should be committed. ${error?.message||''}`.trim());
    } finally {
      if (button){ button.textContent = 'Reset Student Activity'; updateResetButton(); }
    }
  }

  function activatePanel(){
    const tab = byId(TAB_ID);
    const panel = byId(PANEL_ID);
    if (!tab || !panel) return;
    document.querySelectorAll('#teacher .tab').forEach(item=>item.classList.remove('active'));
    document.querySelectorAll('#teacher .panel').forEach(item=>item.classList.remove('active'));
    tab.classList.add('active');
    panel.classList.add('active');
    loadReadiness();
  }

  function wirePanel(){
    ensurePanel();
    const tabs = document.querySelector('#teacher .tabs');
    tabs?.addEventListener('click',event=>{
      const clicked = event.target.closest('.tab');
      if (!clicked) return;
      if (clicked.id===TAB_ID){
        event.preventDefault();
        activatePanel();
      } else {
        byId(TAB_ID)?.classList.remove('active');
        byId(PANEL_ID)?.classList.remove('active');
      }
    });
    byId('v50d1-refresh')?.addEventListener('click',loadReadiness);
    byId('v50d1-generate-pins')?.addEventListener('click',generatePins);
    byId('v50d1-download-pins')?.addEventListener('click',downloadPins);
    byId('v50d1-hide-pins')?.addEventListener('click',()=>{ generatedPins=[]; renderPins(); feedback('try','Plain PIN list hidden from this page. Stored PINs remain hashed and active.'); });
    byId('v50d1-reset-confirm')?.addEventListener('input',updateResetButton);
    byId('v50d1-reset')?.addEventListener('click',resetActivity);
  }

  function wire(){
    injectStyles();
    wirePanel();
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
